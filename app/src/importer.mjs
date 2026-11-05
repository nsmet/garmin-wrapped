import { buildRecap } from "../vendor/public/metrics.mjs";
export class ImportError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}
import {
  exchangeKey,
  activityPage,
  wellness,
  sleepMonth,
  hrvMonth,
} from "./garmin.mjs";
import { abortable, throwIfAborted } from "./abort.mjs";
import { validatePeriod } from "../vendor/public/metrics.mjs";
import { assertRecapRuntime } from "./runtime-check.mjs";

// One token per import. Late cleanup from an older run cannot disconnect a new run.
export function createPersonalSession({
  fetcher = globalThis.fetch,
  ...transport
} = {}) {
  let token = null,
    expires = 0,
    closed = false;
  return {
    async request(path, data = {}, signal) {
      throwIfAborted(signal);
      if (path === "disconnect") {
        closed = true;
        token = null;
        expires = 0;
        return { disconnected: true };
      }
      if (closed)
        throw new ImportError(
          "Your connection expired. Connect again.",
          "SESSION_EXPIRED",
        );
      if (path === "connect") {
        const next = await exchangeKey(data.key, {
          ...transport,
          fetcher,
          signal,
        });
        throwIfAborted(signal);
        if (closed)
          throw new ImportError(
            "Your connection expired. Connect again.",
            "SESSION_EXPIRED",
          );
        token = next;
        expires = Date.now() + 1200000;
        return { connected: true };
      }
      if (!token || expires <= Date.now())
        throw new ImportError(
          "Your connection expired. Connect again.",
          "SESSION_EXPIRED",
        );
      const options = { ...transport, fetcher, token, signal };
      if (path === "activities") return activityPage(data, options);
      if (path === "wellness") return wellness(data, options);
      if (path === "sleep") return sleepMonth(data, options);
      if (path === "hrv") return hrvMonth(data, options);
      throw new ImportError("Unknown request.", "REQUEST_FAILED");
    },
    close() {
      closed = true;
      token = null;
      expires = 0;
    },
  };
}
export async function collectRecap({
  key,
  year,
  timeZone,
  includeSteps = true,
  includeHealth = true,
  signal,
  onProgress = (message) => {},
  onConnected = () => {},
  fetcher,
  ...transport
}) {
  assertRecapRuntime();
  validatePeriod(year, timeZone);
  throwIfAborted(signal);
  const session = createPersonalSession({ fetcher, ...transport });
  const api = (path, data = {}, requestSignal) =>
    session.request(path, data, requestSignal);
  const activities = [],
    daily = [],
    sleep = [],
    hrv = [],
    warnings = [];
  let complete = false,
    start = 0;
  try {
    onProgress("Connecting securely to Garmin…");
    await api("connect", { key }, signal);
    key = "";
    // Garmin accepted the key: only now may the page remember it (when the visitor asked).
    await abortable(onConnected(), signal);
    throwIfAborted(signal);
    for (let page = 0; page < 204; page++) {
      throwIfAborted(signal);
      onProgress(`Reading activity records… ${activities.length} received`);
      const p = await api("activities", { year, timeZone, start }, signal);
      if (!Array.isArray(p.activities))
        throw new ImportError("The activity response was incomplete.", "DATA");
      if (
        p.activities.length &&
        activities.some((a) => a.id === p.activities[0].id)
      )
        throw new ImportError(
          "Garmin repeated an activity page. Try the import again.",
          "PAGINATION",
        );
      activities.push(...p.activities);
      if (p.complete) {
        complete = true;
        break;
      }
      if (
        !Number.isInteger(p.next) ||
        p.next <= start ||
        activities.length > 20000
      )
        throw new ImportError(
          "The import exceeds the supported limit of 20,000 activities.",
          "LIMIT",
        );
      start = p.next;
    }
    if (!complete)
      throw new ImportError(
        "The complete activity list could not be fetched. No annual totals were generated.",
        "INCOMPLETE",
      );
    if (includeSteps || includeHealth) {
      onProgress("Reading recorded daily summaries…");
      try {
        daily.push(
          ...(await api("wellness", { year, includeHealth }, signal)).daily,
        );
      } catch (e) {
        if (
          e.name === "AbortError" ||
          e.code === "GARMIN_AUTH" ||
          e.code === "SESSION_EXPIRED"
        )
          throw e;
        warnings.push(
          "Daily movement and wellness were unavailable. These stories were omitted." +
            (e.code === "GARMIN_TLS"
              ? " A secure source connection failed. Try importing again later."
              : ""),
        );
      }
    }
    if (includeHealth) {
      const today = Object.fromEntries(
        new Intl.DateTimeFormat("en", {
          timeZone,
          year: "numeric",
          month: "numeric",
        })
          .formatToParts(new Date())
          .map((p) => [p.type, p.value]),
      );
      const last = year === Number(today.year) ? Number(today.month) : 12;
      for (let month = 1; month <= last; month++) {
        onProgress(`Reading recorded sleep… month ${month} of ${last}`);
        try {
          sleep.push(...(await api("sleep", { year, month }, signal)).sleep);
        } catch (e) {
          if (
            e.name === "AbortError" ||
            e.code === "GARMIN_AUTH" ||
            e.code === "SESSION_EXPIRED"
          )
            throw e;
          warnings.push(
            "Sleep history was incomplete. Sleep stories were omitted." +
              (e.code === "GARMIN_TLS"
                ? " A secure source connection failed. Try importing again later."
                : ""),
          );
          sleep.length = 0;
          break;
        }
      }
      for (let month = 1; month <= last; month++) {
        onProgress(`Reading recorded HRV… month ${month} of ${last}`);
        try {
          const result = await api("hrv", { year, month }, signal);
          if (!Array.isArray(result.hrv))
            throw new ImportError("The HRV response was incomplete.", "DATA");
          hrv.push(...result.hrv);
        } catch (e) {
          if (
            e.name === "AbortError" ||
            e.code === "GARMIN_AUTH" ||
            e.code === "SESSION_EXPIRED"
          )
            throw e;
          warnings.push(
            "HRV history was unavailable or incomplete. HRV stories were omitted." +
              (e.code === "GARMIN_TLS"
                ? " A secure source connection failed. Try importing again later."
                : ""),
          );
          hrv.length = 0;
          break;
        }
      }
    }
    onProgress("Checking coverage and building your story…");
    throwIfAborted(signal);
    return buildRecap({
      year,
      timeZone,
      activities,
      daily: includeSteps ? daily : daily.map(({ steps, floors, ...d }) => d),
      sleep,
      hrv,
      indexComplete: complete,
      includeHealth,
      warnings,
    });
  } finally {
    key = "";
    activities.length = 0;
    daily.length = 0;
    sleep.length = 0;
    hrv.length = 0;
    // No durable native session, cookie, revocation endpoint or background sync.
    session.close();
  }
}

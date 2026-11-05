import {
  normalizeActivity,
  normalizeDaily,
  normalizeSleep,
  normalizeHrv,
  validatePeriod,
} from "../vendor/public/metrics.mjs";
import { abortable, delay, throwIfAborted } from "./abort.mjs";
const BASE = "https://personal.connectapi.garmin.com";
export class ApiError extends Error {
  constructor(code, message, status = 400, upstreamStatus) {
    super(message);
    this.code = code;
    this.status = status;
    if (
      Number.isInteger(upstreamStatus) &&
      upstreamStatus >= 100 &&
      upstreamStatus <= 599
    )
      this.upstreamStatus = upstreamStatus;
  }
}
async function limitedText(response, signal) {
  const limit = 8_000_000,
    reader = response.body?.getReader?.();
  if (!reader) {
    const text = await abortable(response.text(), signal);
    if (new TextEncoder().encode(text).byteLength > limit)
      throw new ApiError(
        "UPSTREAM_DATA",
        "Garmin returned too much data.",
        502,
      );
    return text;
  }
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await abortable(reader.read(), signal);
      if (done) break;
      size += value.byteLength;
      if (size > limit)
        throw new ApiError(
          "UPSTREAM_DATA",
          "Garmin returned too much data.",
          502,
        );
      chunks.push(value);
    }
    const data = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      data.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder().decode(data);
  } finally {
    void reader.cancel().catch(() => {});
    reader.releaseLock?.();
    chunks.length = 0;
  }
}
export async function garmin(
  path,
  {
    token,
    key,
    signal,
    fetcher = globalThis.fetch,
    sleep = delay,
    timeoutMs = 15000,
  } = {},
) {
  if (
    typeof path !== "string" ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    /[\r\n]/.test(path)
  )
    throw new ApiError("REQUEST_INVALID", "Invalid Garmin request.");
  for (let attempt = 0; attempt < 3; attempt++) {
    throwIfAborted(signal);
    let response;
    const request = new AbortController();
    let timedOut = false;
    const forward = () => request.abort(signal.reason);
    signal?.addEventListener("abort", forward, { once: true });
    const deadline = setTimeout(() => {
      timedOut = true;
      request.abort();
    }, timeoutMs);
    try {
      // The native caller supplies expo/fetch. React Native's global fetch does
      // not reliably implement manual redirects or streamed bodies.
      response = await abortable(
        fetcher(BASE + path, {
          method: key ? "POST" : "GET",
          headers: {
            Authorization: key ? "ApiKey " + key : "Bearer " + token,
            Accept: key ? "*/*" : "application/json",
            "Cache-Control": "no-store",
          },
          signal: request.signal,
          redirect: "manual",
          credentials: "omit",
          cache: "no-store",
        }),
        request.signal,
      );
      if (
        response.redirected ||
        (response.status >= 300 && response.status < 400)
      )
        throw new ApiError(
          "GARMIN_REDIRECT",
          "Garmin returned an unexpected redirect. Please try again later.",
          502,
        );
      if (response.ok) {
        if (response.status === 204) return null;
        const text = await limitedText(response, request.signal);
        throwIfAborted(signal);
        if (key) return text.trim();
        try {
          return JSON.parse(text);
        } catch {
          throw new ApiError(
            "UPSTREAM_DATA",
            "Garmin returned an unreadable response. Try again later.",
            502,
          );
        }
      }
    } catch (error) {
      throwIfAborted(signal);
      if (error instanceof ApiError) throw error;
      response = undefined;
      if (attempt === 2)
        throw new ApiError(
          timedOut ? "GARMIN_TIMEOUT" : "GARMIN_UNAVAILABLE",
          timedOut
            ? "Garmin took too long to respond. Please reconnect and try again."
            : "Garmin could not be reached. Please try again.",
          503,
        );
    } finally {
      clearTimeout(deadline);
      signal?.removeEventListener("abort", forward);
      request.abort();
      void response?.body?.cancel?.().catch(() => {});
    }
    if (!response) {
      await abortable(sleep(250 * 2 ** attempt, signal), signal);
      continue;
    }
    if (response.status === 401)
      throw new ApiError(
        "GARMIN_AUTH",
        "Your Garmin key or session has expired. Connect again with a valid key.",
        401,
      );
    if (response.status === 403)
      throw new ApiError(
        "GARMIN_PERMISSION",
        "Garmin did not allow access to these records. Check your key permissions.",
        403,
      );
    if ((response.status === 429 || response.status >= 500) && attempt < 2) {
      const retry = Math.min(
        5000,
        Math.max(
          0,
          Number(response.headers.get("Retry-After")) * 1000 ||
            250 * 2 ** attempt,
        ),
      );
      await abortable(sleep(retry, signal), signal);
      continue;
    }
    if (response.status === 429)
      throw new ApiError(
        "GARMIN_RATE_LIMIT",
        "Garmin is busy. Wait a minute before trying again.",
        429,
      );
    if (response.status === 526)
      throw new ApiError(
        "GARMIN_TLS",
        "A secure connection to Garmin could not be verified. Please try again later.",
        503,
        response.status,
      );
    throw new ApiError(
      "GARMIN_UNAVAILABLE",
      "Garmin could not complete this request. Please try again later.",
      502,
      response.status,
    );
  }
}
export async function exchangeKey(key, options = {}) {
  if (
    typeof key !== "string" ||
    key.length < 16 ||
    key.length > 4096 ||
    /\s/.test(key)
  )
    throw new ApiError("KEY_INVALID", "Paste a valid Garmin Personal API key.");
  const raw = await garmin(
    "/personalapitoken-service/personal-api/personal-api-key/token",
    { ...options, key },
  );
  let token = raw; // Garmin's current official client reads a plain text JWT.
  if (raw?.startsWith("{")) {
    try {
      const d = JSON.parse(raw);
      token = d.access_token || d.accessToken || d.token;
    } catch {}
  }
  if (
    typeof token !== "string" ||
    token.length > 6000 ||
    !/^[-\w]+\.[-\w]+\.[-\w]+$/.test(token)
  )
    throw new ApiError(
      "TOKEN_INVALID",
      "Garmin returned an unsupported token response.",
      502,
    );
  return token;
}
function period(year, timeZone) {
  try {
    return validatePeriod(year, timeZone);
  } catch {
    throw new ApiError("PERIOD_INVALID", "Choose a valid year and time zone.");
  }
}
function dates(year) {
  return { startDate: `${year - 1}-12-31`, endDate: `${year + 1}-01-01` };
}
export async function activityPage(
  { year, timeZone, start = 0 },
  options = {},
) {
  period(year, timeZone);
  if (!Number.isInteger(start) || start < 0 || start > 20000)
    throw new ApiError("PAGE_INVALID", "The activity page is invalid.");
  const query = new URLSearchParams({
    ...dates(year),
    start: String(start),
    limit: "99",
    sortBy: "startLocal",
    sortOrder: "asc",
    excludeChildren: "true",
  });
  const rows = await garmin(
    "/activitylist-service/activities/search/activities?" + query,
    options,
  );
  if (rows !== null && !Array.isArray(rows))
    throw new ApiError(
      "UPSTREAM_DATA",
      "Garmin returned an unsupported activity list.",
      502,
    );
  const raw = rows || [];
  if (raw.length > 99)
    throw new ApiError(
      "UPSTREAM_DATA",
      "Garmin returned an unexpected page size.",
      502,
    );
  let activities;
  try {
    activities = raw.map(normalizeActivity);
  } catch {
    throw new ApiError(
      "UPSTREAM_DATA",
      "Some activities have missing identifiers or timestamps. No annual totals were generated.",
      502,
    );
  }
  // Only an empty terminal page proves pagination ended; short pages can be server caps.
  return {
    activities,
    next: raw.length ? start + raw.length : null,
    complete: raw.length === 0,
  };
}
export async function wellness({ year, includeHealth = true }, options = {}) {
  period(year, "UTC");
  const query = new URLSearchParams({
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  });
  const value = await garmin(
    "/usersummary-service/v2/dailysummaries?" + query,
    options,
  );
  if (value !== null && !Array.isArray(value?.data))
    throw new ApiError(
      "UPSTREAM_DATA",
      "Garmin returned unsupported daily summaries.",
      502,
    );
  try {
    return {
      daily: (value?.data || []).map(normalizeDaily).map((d) => {
        if (includeHealth) return d;
        const { stress, restingHR, ...movement } = d;
        return movement;
      }),
    };
  } catch {
    throw new ApiError(
      "UPSTREAM_DATA",
      "Some daily summaries were incomplete.",
      502,
    );
  }
}
export async function sleepMonth({ year, month }, options = {}) {
  period(year, "UTC");
  if (!Number.isInteger(month) || month < 1 || month > 12)
    throw new ApiError("MONTH_INVALID", "Choose a valid month.");
  const mm = String(month).padStart(2, "0"),
    last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const query = new URLSearchParams({
    startDate: `${year}-${mm}-01`,
    endDate: `${year}-${mm}-${last}`,
  });
  const rows = await garmin(
    "/sleep-service/sleep/dailySleepSummariesByDate?" + query,
    options,
  );
  if (rows !== null && !Array.isArray(rows))
    throw new ApiError(
      "UPSTREAM_DATA",
      "Garmin returned unsupported sleep summaries.",
      502,
    );
  try {
    return { sleep: (rows || []).map(normalizeSleep) };
  } catch {
    throw new ApiError(
      "UPSTREAM_DATA",
      "Some sleep summaries were incomplete.",
      502,
    );
  }
}
export async function hrvMonth({ year, month }, options = {}) {
  period(year, "UTC");
  if (!Number.isInteger(month) || month < 1 || month > 12)
    throw new ApiError("MONTH_INVALID", "Choose a valid month.");
  const mm = String(month).padStart(2, "0"),
    last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const value = await garmin(
    `/hrv-service/hrv/daily/${year}-${mm}-01/${year}-${mm}-${last}`,
    options,
  );
  if (value !== null && !Array.isArray(value?.hrvSummaries))
    throw new ApiError(
      "UPSTREAM_DATA",
      "Garmin returned unsupported HRV summaries.",
      502,
    );
  try {
    return { hrv: (value?.hrvSummaries || []).map(normalizeHrv) };
  } catch {
    throw new ApiError(
      "UPSTREAM_DATA",
      "Some HRV summaries were incomplete.",
      502,
    );
  }
}

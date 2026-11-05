import test from "node:test";
import assert from "node:assert/strict";
import { garmin, exchangeKey, wellness, activityPage } from "../src/garmin.mjs";
import { collectRecap, createPersonalSession } from "../src/importer.mjs";
const key = "synthetic-personal-key-123",
  token = "synthetic.token.value";
const row = {
  activityId: "synthetic-1",
  startTimeGMT: "2025-04-02 12:00:00",
  activityType: { typeKey: "running" },
  duration: 1801,
  distance: 5001,
};
const request = (extra = {}) => ({ token, sleep: async () => {}, ...extra });
const noHealth = {
  key,
  year: 2025,
  timeZone: "Europe/Brussels",
  includeSteps: false,
  includeHealth: false,
  sleep: async () => {},
};
function fixture({
  optionalFailure = false,
  authFailure = false,
  repeat = false,
} = {}) {
  return async (url, init) => {
    assert.equal(init.redirect, "manual");
    assert.equal(init.credentials, "omit");
    assert.equal(init.headers["Cache-Control"], "no-store");
    if (url.includes("personalapitoken")) return new Response(token);
    if (url.includes("activitylist"))
      return Response.json(
        new URL(url).searchParams.get("start") === "0" || repeat ? [row] : [],
      );
    if (authFailure) return new Response("", { status: 401 });
    if (optionalFailure) return new Response("", { status: 403 });
    if (url.includes("usersummary"))
      return Response.json({
        data: [
          {
            calendarDate: "2025-01-01",
            includesWellnessData: true,
            movement: { steps: { value: 123 } },
            heartRate: { restingValue: 50 },
          },
        ],
      });
    if (url.includes("sleep")) return Response.json([]);
    if (url.includes("hrv")) return Response.json({ hrvSummaries: [] });
    throw Error("Unexpected synthetic request");
  };
}
test(
  "cancellation releases a session even if accepted-key storage never completes",
  { timeout: 1000 },
  async () => {
    const controller = new AbortController();
    let releaseStorage, reachedStorage;
    const stored = new Promise((resolve) => {
      releaseStorage = resolve;
    });
    const storing = new Promise((resolve) => {
      reachedStorage = resolve;
    });
    let calls = 0;
    const pending = collectRecap({
      ...noHealth,
      signal: controller.signal,
      fetcher: async () => {
        calls++;
        return new Response(token);
      },
      onConnected: () => {
        reachedStorage();
        return stored;
      },
    });
    const rejected = assert.rejects(pending, (e) => e.name === "AbortError");
    await storing;
    controller.abort();
    await rejected;
    releaseStorage();
    await Promise.resolve();
    assert.equal(
      calls,
      1,
      "a cancelled storage continuation must not request records",
    );
  },
);
test("supports streamed, text-only and JSON-wrapped JWTs without native global fetch assumptions", async () => {
  assert.equal(
    await exchangeKey(key, {
      fetcher: async () => ({ ok: true, status: 200, text: async () => token }),
    }),
    token,
  );
  assert.equal(
    await exchangeKey(key, {
      fetcher: async () =>
        new Response(JSON.stringify({ access_token: token })),
    }),
    token,
  );
  await assert.rejects(
    () =>
      exchangeKey("short", { fetcher: () => assert.fail("invalid key sent") }),
    (e) => e.code === "KEY_INVALID",
  );
});
test("manual redirects are rejected once, without contacting another URL", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      exchangeKey(key, {
        fetcher: async () => {
          calls++;
          return new Response("", {
            status: 302,
            headers: { Location: "https://invalid.example/" },
          });
        },
      }),
    (e) => e.code === "GARMIN_REDIRECT",
  );
  assert.equal(calls, 1);
});
test("request deadline covers hung fetch and hung response body; bounded retries finish", async () => {
  for (const fetcher of [
    () => new Promise(() => {}),
    async () => ({ ok: true, status: 200, text: () => new Promise(() => {}) }),
  ]) {
    let calls = 0;
    await assert.rejects(
      () =>
        garmin(
          "/test",
          request({
            timeoutMs: 5,
            fetcher: (...args) => {
              calls++;
              return fetcher(...args);
            },
          }),
        ),
      (e) => e.code === "GARMIN_TIMEOUT",
    );
    assert.equal(calls, 3);
  }
});
test("cancel interrupts a hung request and a Retry-After wait immediately", async () => {
  for (const fetcher of [
    () => new Promise(() => {}),
    async () =>
      new Response("", { status: 429, headers: { "Retry-After": "5" } }),
  ]) {
    const controller = new AbortController();
    let calls = 0;
    const pending = garmin("/test", {
      token,
      signal: controller.signal,
      fetcher: (...args) => {
        calls++;
        return fetcher(...args);
      },
    });
    setTimeout(() => controller.abort(), 5);
    await assert.rejects(pending, (e) => e.name === "AbortError");
    assert.equal(calls, 1);
  }
});
test("rate limiting and server failures retry at most three times and clamp delays", async () => {
  let calls = 0;
  const waits = [];
  await assert.rejects(
    () =>
      garmin(
        "/test",
        request({
          fetcher: async () => {
            calls++;
            return new Response("", {
              status: 429,
              headers: { "Retry-After": "999" },
            });
          },
          sleep: async (ms) => waits.push(ms),
        }),
      ),
    (e) => e.code === "GARMIN_RATE_LIMIT",
  );
  assert.equal(calls, 3);
  assert.deepEqual(waits, [5000, 5000]);
  for (const status of [401, 403]) {
    calls = 0;
    await assert.rejects(() =>
      garmin(
        "/test",
        request({
          fetcher: async () => {
            calls++;
            return new Response("", { status });
          },
        }),
      ),
    );
    assert.equal(calls, 1);
  }
});
test("malformed, oversized, and incomplete records never produce totals", async () => {
  await assert.rejects(
    () =>
      garmin(
        "/test",
        request({ fetcher: async () => new Response("not json") }),
      ),
    (e) => e.code === "UPSTREAM_DATA",
  );
  await assert.rejects(
    () =>
      garmin(
        "/test",
        request({
          fetcher: async () => ({
            ok: true,
            status: 200,
            text: async () => "x".repeat(8000001),
          }),
        }),
      ),
    (e) => e.code === "UPSTREAM_DATA",
  );
  await assert.rejects(
    () =>
      activityPage(
        { year: 2025, timeZone: "UTC" },
        request({ fetcher: async () => Response.json([{ activityId: 1 }]) }),
      ),
    (e) => e.code === "UPSTREAM_DATA",
  );
  await assert.rejects(
    () => collectRecap({ ...noHealth, fetcher: fixture({ repeat: true }) }),
    (e) => e.code === "PAGINATION",
  );
});
test("short pages require an empty terminal page; optional failures match web omission behavior", async () => {
  const plan = await collectRecap({
    ...noHealth,
    includeHealth: true,
    includeSteps: true,
    fetcher: fixture({ optionalFailure: true }),
  });
  assert.equal(plan.activityAudit.counted, 1);
  assert.ok(plan.stories.some((s) => s.id === "running-distance"));
  assert.ok(!plan.stories.some((s) => s.health));
  assert.equal(
    plan.warnings.filter((w) => /unavailable|incomplete/.test(w)).length,
    3,
  );
  await assert.rejects(
    () =>
      collectRecap({
        ...noHealth,
        includeSteps: true,
        fetcher: fixture({ authFailure: true }),
      }),
    (e) => e.code === "GARMIN_AUTH",
  );
});
test("movement-only transport strips health fields like the website API", async () => {
  const result = await wellness(
    { year: 2025, includeHealth: false },
    request({ fetcher: fixture() }),
  );
  assert.equal(result.daily[0].steps, 123);
  assert.ok(!("restingHR" in result.daily[0]));
  assert.ok(!("stress" in result.daily[0]));
});
test("sessions are isolated and closed sessions reject late exchange results", async () => {
  let complete;
  const first = createPersonalSession({
    fetcher: () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  });
  const pending = first.request("connect", { key });
  first.close();
  complete(new Response(token));
  await assert.rejects(pending, (e) => e.code === "SESSION_EXPIRED");
  const a = createPersonalSession({ fetcher: fixture() }),
    b = createPersonalSession({ fetcher: fixture() });
  await Promise.all([
    a.request("connect", { key }),
    b.request("connect", { key }),
  ]);
  a.close();
  assert.equal(
    (await b.request("activities", { year: 2025, timeZone: "UTC" })).activities
      .length,
    1,
  );
  b.close();
  await assert.rejects(
    () => b.request("activities", {}),
    (e) => e.code === "SESSION_EXPIRED",
  );
});
test("invalid periods never exchange a key and cancellation after exchange never returns a recap", async () => {
  await assert.rejects(() =>
    collectRecap({
      ...noHealth,
      year: 1999,
      fetcher: () => assert.fail("must not connect"),
    }),
  );
  const controller = new AbortController();
  await assert.rejects(
    () =>
      collectRecap({
        ...noHealth,
        signal: controller.signal,
        fetcher: fixture(),
        onConnected: () => controller.abort(),
      }),
    (e) => e.name === "AbortError",
  );
});

test("a runtime with incomplete Intl fails before any Garmin request", async () => {
  const original = Intl.DateTimeFormat;
  Intl.DateTimeFormat = function (...args) {
    const formatter = new original(...args);
    return {
      format: formatter.format,
      formatToParts: () => [{ type: "integer", value: "1735689600000" }],
    };
  };
  try {
    await assert.rejects(
      () =>
        collectRecap({
          ...noHealth,
          fetcher: () => assert.fail("unsupported runtime connected"),
        }),
      (e) => e.code === "RUNTIME_UNSUPPORTED",
    );
  } finally {
    Intl.DateTimeFormat = original;
  }
});

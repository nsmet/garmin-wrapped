import test from "node:test";
import assert from "node:assert/strict";
import { collectRecap } from "../src/importer.mjs";

test("personal key exchange, paginated activities and normalized recap", async () => {
  const original = globalThis.fetch,
    urls = [],
    authorization = [];
  globalThis.fetch = async (url, options) => {
    urls.push(String(url));
    authorization.push(options.headers.Authorization);
    if (String(url).includes("personalapitoken-service"))
      return new Response("aaa.bbb.ccc");
    if (String(url).includes("activitylist-service")) {
      const start = new URL(url).searchParams.get("start");
      return Response.json(
        start === "0"
          ? [
              {
                activityId: 1,
                startTimeGMT: "2025-04-02 12:00:00",
                activityType: { typeKey: "running" },
                duration: 1800,
                distance: 5000,
              },
            ]
          : [],
      );
    }
    throw Error("Unexpected upstream request");
  };
  try {
    const result = await collectRecap({
      key: "0123456789abcdef",
      year: 2025,
      timeZone: "UTC",
      includeSteps: false,
      includeHealth: false,
    });
    assert.ok(
      result.stories.some(
        (s) => s.id === "running-sessions" && s.value === "1",
      ),
    );
    assert.equal(urls.length, 3);
    assert.equal(authorization[0], "ApiKey 0123456789abcdef");
    assert.equal(authorization[1], "Bearer aaa.bbb.ccc");
  } finally {
    globalThis.fetch = original;
  }
});

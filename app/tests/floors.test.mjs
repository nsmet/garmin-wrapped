import test from "node:test";
import assert from "node:assert/strict";
import { normalizeDaily, buildRecap } from "../vendor/public/metrics.mjs";
import { wellness } from "../src/garmin.mjs";
import { collectRecap } from "../src/importer.mjs";
import { cardSpec } from "../vendor/public/dot-spec.mjs";
import { build, fracDots } from "../vendor/public/dot-engine.mjs";

// Garmin Personal API: UserDailySummaryV2DTO.movement.floorsAscended.value (whole floors).
const summary = (date, floors, wellness = true) => ({
  calendarDate: date,
  includesWellnessData: wellness,
  movement: {
    steps: { value: 4000 },
    floorsAscended: {
      goal: 10,
      value: floors,
      distanceInMeters: floors * 3.05,
    },
  },
});
const activity = {
  id: "1",
  utc: Date.UTC(2025, 2, 10, 6),
  type: "running",
  parentId: null,
  distance: 5000,
  duration: 1800,
};
const recap = (daily) =>
  buildRecap({
    year: 2025,
    timeZone: "UTC",
    activities: [activity],
    daily,
    indexComplete: true,
    now: new Date("2025-10-23T12:00:00Z"),
  });

test("floors climbed are read from movement.floorsAscended.value and stay absent when unrecorded", () => {
  assert.equal(normalizeDaily(summary("2025-01-01", 12)).floors, 12);
  assert.equal(normalizeDaily(summary("2025-01-01", 12, false)).floors, null);
  assert.equal(
    normalizeDaily({
      calendarDate: "2025-01-01",
      includesWellnessData: true,
      movement: { steps: { value: 1 } },
    }).floors,
    null,
  );
  assert.equal(normalizeDaily(summary("2025-01-01", -3)).floors, null);
});

test("a floors story sums recorded days only and is omitted when nothing was climbed", () => {
  const daily = [
    summary("2025-01-01", 10),
    summary("2025-01-02", 0),
    {
      calendarDate: "2025-01-03",
      includesWellnessData: true,
      movement: { steps: { value: 1 } },
    },
  ].map(normalizeDaily);
  const story = recap(daily).stories.find((s) => s.id === "floors-total");
  assert.equal(story.value, "10");
  assert.equal(story.unit, "FLOORS CLIMBED · 2 RECORDED DAYS");
  assert.equal(story.chapterId, "everyday_movement");
  assert.equal(story.health, false);
  assert.ok(
    !recap([summary("2025-01-01", 0)].map(normalizeDaily)).stories.some(
      (s) => s.id === "floors-total",
    ),
  );
  assert.ok(!recap([]).stories.some((s) => s.id === "floors-total"));
});

test("floors are everyday movement: kept without health consent, dropped with steps", async () => {
  const d = await wellness(
    { year: 2025, includeHealth: false },
    {
      fetcher: async () =>
        Response.json({
          data: [
            { ...summary("2025-01-01", 7), heartRate: { restingValue: 50 } },
          ],
        }),
    },
  );
  assert.equal(d.daily[0].floors, 7);
  assert.ok(!("restingHR" in d.daily[0]));
  const fetcher = async (url) => {
    if (url.includes("personalapitoken"))
      return new Response("synthetic.token.value");
    if (url.includes("activitylist"))
      return Response.json(
        new URL(url).searchParams.get("start") === "0"
          ? [
              {
                activityId: 1,
                startTimeGMT: "2025-03-10 06:00:00",
                activityType: { typeKey: "running" },
                duration: 1800,
                distance: 5000,
              },
            ]
          : [],
      );
    if (url.includes("usersummary"))
      return Response.json({ data: [summary("2025-01-01", 7)] });
    if (url.includes("sleep")) return Response.json([]);
    return Response.json({ hrvSummaries: [] });
  };
  const without = await collectRecap({
    key: "fictional-test-key",
    year: 2025,
    timeZone: "UTC",
    includeSteps: false,
    includeHealth: true,
    fetcher,
  });
  assert.ok(!without.stories.some((s) => s.id === "floors-total"));
  const withSteps = await collectRecap({
    key: "fictional-test-key",
    year: 2025,
    timeZone: "UTC",
    fetcher,
  });
  assert.equal(
    withSteps.stories.find((s) => s.id === "floors-total")?.value,
    "7",
  );
});

test("the floors card fills a stairwell with one dot per stated number of floors", () => {
  const story = {
    id: "floors-total",
    title: ["ONE FLOOR", "AT A TIME."],
    value: "2,970",
    unit: "FLOORS CLIMBED · 330 RECORDED DAYS",
    caption: "330 days with floor records.\nMissing days are never zero.",
  };
  const spec = cardSpec(story, {});
  assert.equal(spec.L, "shape");
  assert.equal(spec.p.kind, "floors");
  const unit = Number(spec.legend.match(/= (\d+) floor/)[1]);
  assert.equal(
    build(spec).pts.filter((p) => p.dat).length,
    fracDots(2970, unit).total,
  );
});

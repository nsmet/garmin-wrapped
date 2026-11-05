import "../../src/polyfills";
import {
  normalizeActivity,
  normalizeDaily,
  normalizeSleep,
  normalizeHrv,
} from "../../vendor/public/metrics.mjs";
import { sanitizedCard, canShare } from "../../vendor/public/story-model.mjs";
import { decodeBase64 } from "../../src/export-transfer.mjs";
let checks = 0;
function assert(ok, message) {
  checks++;
  if (!ok) throw Error(message);
}
const raw = {
  activityId: "synthetic-id",
  startTimeGMT: "2025-01-01 00:00:00",
  activityType: { typeKey: "running" },
  distance: 5000,
  duration: 1801,
};
assert(normalizeActivity(raw).utc === Date.UTC(2025, 0, 1), "UTC parsing");
assert(
  normalizeActivity({ ...raw, distance: "5000" }).distance === null,
  "Numeric strings",
);
for (const value of [-1, NaN, Infinity, "123", null])
  assert(
    normalizeActivity({ ...raw, distance: value }).distance === null,
    "Invalid distance",
  );
assert(
  normalizeActivity({ ...raw, averageHR: 180, maxHR: 120 }).averageHR === null,
  "Contradictory heart rate",
);
assert(
  normalizeDaily({
    calendarDate: "2025-01-01",
    includesWellnessData: false,
    movement: { steps: { value: 123 } },
  }).steps === null,
  "Missing wellness",
);
assert(
  normalizeDaily({
    calendarDate: "2025-01-01",
    includesWellnessData: true,
    movement: { floorsAscended: { value: 7 } },
  }).floors === 7,
  "Floors field",
);
for (const seconds of [-1, 0, 86401, "25200"])
  assert(
    normalizeSleep({ calendarDate: "2025-01-01", sleepTimeSeconds: seconds })
      .seconds === null,
    "Sleep normalization",
  );
for (const extra of [
  { weeklyAvg: 50 },
  { lastNightAvg: 0 },
  { lastNightAvg: "50" },
  { lastNightAvg: 1001 },
  { lastNightAvg: 50, status: "INVALID" },
])
  assert(
    normalizeHrv({ calendarDate: "2025-01-01", ...extra }).hrv === null,
    "HRV normalization",
  );
const grouped = Map.groupBy([1, 2, 3], (v) => v % 2);
assert(grouped.get(1).join(",") === "1,3", "Map grouping");
assert(
  Object.groupBy([1, 2, 3], (v) => v % 2)["0"][0] === 2,
  "Object grouping",
);
const story = {
  id: "max-hr",
  template: "heart",
  title: ["YOUR HIGHEST", "RECORDED HR."],
  value: "170",
  unit: "BPM",
  caption: "Synthetic only",
  health: true,
  sanitized: true,
  sharePolicy: "requires_explicit_share_consent",
  evidence: ["private-synthetic-id"],
  latitude: 1,
};
const dataset = { exampleOnly: false, shareConsents: new Set() };
assert(!canShare(story, dataset), "Health consent denied");
dataset.shareConsents.add(story.id);
const card = sanitizedCard(story, dataset);
assert(
  !JSON.stringify(card).includes("private-synthetic-id"),
  "Evidence removed",
);
assert(!("latitude" in card), "Location removed");
assert(decodeBase64("AQID").join(",") === "1,2,3", "Portable PNG decoding");
print(
  `${checks} Hermes portable checks passed. Full recap/Intl and native I/O require separate validation.`,
);

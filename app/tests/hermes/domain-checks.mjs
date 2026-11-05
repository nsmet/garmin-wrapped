import { assertRecapRuntime } from "../../src/runtime-check.mjs";
import "../../src/polyfills.ts";
import {
  normalizeActivity,
  normalizeDaily,
  normalizeHrv,
  buildRecap,
  validatePeriod,
} from "../../vendor/public/metrics.mjs";
import {
  datasetFromPlan,
  sanitizedCard,
} from "../../vendor/public/story-model.mjs";
import {
  makePresentation,
  createShareAuthority,
} from "../../src/presentation.mjs";
import { decodeBase64 } from "../../src/export-transfer.mjs";

// Shared by the CLI and the credential-free native iOS runtime probe.
export function runDomainChecks() {
  let checks = 0;
  const assert = (condition, message) => {
    checks++;
    if (!condition) throw Error(message);
  };
  assertRecapRuntime();
  const hour = (utc, timeZone) =>
    new Intl.DateTimeFormat("en", {
      timeZone,
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(utc))
      .find((part) => part.type === "hour")?.value;
  assert(
    hour("2025-03-30T00:30:00Z", "Europe/Brussels") === "01",
    "Before European DST",
  );
  assert(
    hour("2025-03-30T01:30:00Z", "Europe/Brussels") === "03",
    "After European DST",
  );
  assert(
    hour("2025-11-02T05:30:00Z", "America/New_York") === "01",
    "Before US DST fold",
  );
  assert(
    hour("2025-11-02T06:30:00Z", "America/New_York") === "01",
    "After US DST fold",
  );
  const raw = {
    activityId: "synthetic-1",
    startTimeGMT: "2024-12-31 23:30:00",
    activityType: { typeKey: "running" },
    distance: 5001,
    duration: 1801,
    averageHR: 130,
    maxHR: 170,
  };
  const activity = normalizeActivity(raw),
    plan = buildRecap({
      year: 2025,
      timeZone: "Europe/Brussels",
      activities: [
        activity,
        activity,
        { ...activity, id: "synthetic-child", parentId: "synthetic-1" },
      ],
      includeHealth: true,
      indexComplete: true,
      now: new Date("2026-01-01T12:00:00Z"),
    });
  assert(
    plan.activityAudit.counted === 1,
    "Time zones or deduplication differ",
  );
  assert(
    plan.activityAudit.excluded.children === 1,
    "Multisport children differ",
  );
  assert(
    plan.stories.find((s) => s.id === "running-distance").value === "5.0",
    "Distance precision differs",
  );
  assert(
    plan.stories
      .find((s) => s.id === "running-hours")
      .caption.includes("30m 01s"),
    "Duration seconds differ",
  );
  assert(
    normalizeActivity({ ...raw, distance: "5001" }).distance === null,
    "Numeric strings became measurements",
  );
  assert(
    normalizeDaily({ calendarDate: "2025-01-01", includesWellnessData: false })
      .steps === null,
    "Missing days became zero",
  );
  assert(
    normalizeHrv({ calendarDate: "2025-01-01", weeklyAvg: 60 }).hrv === null,
    "Wrong HRV source",
  );
  assert(
    validatePeriod(2025, "America/New_York", new Date("2026-01-01T00:30:00Z"))
      .complete === false,
    "Local year boundary differs",
  );
  const dataset = datasetFromPlan(plan),
    health = dataset.stories.find((s) => s.health);
  let blocked = false;
  try {
    sanitizedCard(health, dataset);
  } catch {
    blocked = true;
  }
  assert(blocked, "Health exported without consent");
  const { presentation } = makePresentation(plan, "session-hermes");
  assert(
    !JSON.stringify(presentation).includes("synthetic-1"),
    "Source identifiers reached viewer",
  );
  const authority = createShareAuthority(dataset, "session-hermes");
  const grant = authority.begin(health.id, "share-hermes", {
    healthConsent: true,
  });
  assert(authority.accepts(grant), "Consent grant rejected");
  authority.revoke();
  assert(!authority.accepts(grant), "Revoked consent accepted");
  assert(decodeBase64("AQID").join(",") === "1,2,3", "PNG decoder differs");

  return { checks };
}

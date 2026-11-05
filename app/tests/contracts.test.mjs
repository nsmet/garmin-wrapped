import test from "node:test";
import assert from "node:assert/strict";
import {
  makePresentation,
  validPresentation,
  createShareAuthority,
} from "../src/presentation.mjs";
import {
  createTransfer,
  validatePng,
  decodeBase64,
} from "../src/export-transfer.mjs";
import { allowViewerNavigation } from "../src/navigation.mjs";
import { dataset as example } from "../vendor/public/sample-data.mjs";
import { buildRecap } from "../vendor/public/metrics.mjs";
const nativePlan = () =>
  buildRecap({
    year: 2025,
    timeZone: "UTC",
    indexComplete: true,
    includeHealth: true,
    activities: [
      {
        id: "private-synthetic-record",
        utc: Date.UTC(2025, 2, 10),
        type: "running",
        parentId: null,
        duration: 1800,
        distance: 5000,
        maxHR: 170,
        averageHR: 130,
      },
    ],
    now: new Date("2026-01-01"),
  });
test("viewer gets all admitted stories in order, with no source records, evidence, or private identifiers", () => {
  const plan = nativePlan(),
    { dataset, presentation } = makePresentation(plan, "session-test");
  assert.ok(validPresentation(presentation));
  assert.deepEqual(
    presentation.stories.map((s) => s.id),
    dataset.stories.map((s) => s.id),
  );
  const text = JSON.stringify(presentation);
  for (const key of [
    "private-synthetic-record",
    "activityAudit",
    "evidence",
    "metrics",
    "utc",
    "parentId",
  ])
    assert.ok(!text.includes(key));
  assert.ok(!validPresentation({ ...presentation, token: "private" }));
  assert.ok(
    !validPresentation({
      ...presentation,
      stories: [{ ...presentation.stories[0], latitude: 1 }],
    }),
  );
});
test("fictional example covers the full recap and cycling promotion, which cannot be shared", () => {
  const { dataset, presentation } = makePresentation(
    example,
    "session-example",
  );
  assert.ok(presentation.stories.length > 50);
  assert.equal(presentation.stories.at(-1).id, "mini-watt");
  assert.ok(presentation.stories.some((s) => s.health));
  assert.throws(() =>
    createShareAuthority(dataset, "session-example").begin(
      "mini-watt",
      "share-test",
    ),
  );
});
test("a real-data health share requires separate consent, revoked at the end of each interaction", () => {
  const { dataset, presentation } = makePresentation(
      nativePlan(),
      "session-test",
    ),
    auth = createShareAuthority(dataset, presentation.generation);
  const health = dataset.stories.find((s) => s.health);
  assert.throws(() => auth.begin(health.id, "share-first"));
  const grant = auth.begin(health.id, "share-first", { healthConsent: true });
  assert.ok(auth.accepts(grant));
  assert.ok(!auth.accepts({ ...grant, generation: "session-old" }));
  auth.revoke();
  assert.ok(!auth.accepts(grant));
  assert.equal(dataset.shareConsents.size, 0);
  assert.throws(() => auth.begin(health.id, "share-second"));
});
test("PNG transfer rejects malformed, out-of-order, stale and oversized chunks", () => {
  const transfer = createTransfer((p) => p.generation === "session-test");
  assert.throws(() =>
    transfer.receive({
      generation: "session-old",
      index: 0,
      data: "AAAA",
      final: false,
    }),
  );
  assert.throws(() =>
    transfer.receive({
      generation: "session-test",
      index: 1,
      data: "AAAA",
      final: false,
    }),
  );
  assert.throws(() =>
    transfer.receive({
      generation: "session-test",
      index: 0,
      data: "A".repeat(50000),
      final: false,
    }),
  );
  transfer.clear();
  assert.throws(() =>
    transfer.receive({
      generation: "session-test",
      index: 0,
      data: "AAAA",
      final: false,
    }),
  );
  assert.throws(() => decodeBase64("bad!"));
  assert.throws(() => validatePng(new Uint8Array(100)));
});
test("navigation rejects remote pages, other local files, javascript and production dev servers", () => {
  assert.ok(
    allowViewerNavigation("file:///android_asset/www.bundle/Viewer.html"),
  );
  assert.ok(
    allowViewerNavigation(
      "file:///var/containers/Bundle/Example.app/www.bundle/Viewer.html",
    ),
  );
  for (const url of [
    "https://garmin-wrapped.miniwatt.app/",
    "javascript:alert(1)",
    "file:///data/private",
    "file:///tmp/www.bundle/../private",
    "http://localhost:8081/_expo/@dom/Viewer",
  ])
    assert.equal(allowViewerNavigation(url), false);
  assert.ok(
    allowViewerNavigation(
      "http://192.0.2.1:8081/_expo/@dom/Viewer",
      true,
      "192.0.2.1:8081",
    ),
  );
  assert.equal(
    allowViewerNavigation(
      "http://evil.example/_expo/@dom/Viewer",
      true,
      "192.0.2.1:8081",
    ),
    false,
  );
});

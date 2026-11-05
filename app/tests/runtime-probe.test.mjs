import test from "node:test";
import assert from "node:assert/strict";
import { runDomainChecks } from "./hermes/domain-checks.mjs";

test("the shared iOS runtime probe passes its synthetic domain fixtures in Node", () => {
  assert.ok(runDomainChecks().checks >= 16);
});

import { runDomainChecks } from "./domain-checks.mjs";
const { checks } = runDomainChecks();
print(
  `${checks} Hermes domain checks passed: grouping, Intl time zones/year boundaries, normalization, precision, coverage, consent and presentation sanitization.`,
);

import test from "node:test";
import assert from "node:assert/strict";

import {
  PATIENT_CHOICE_COUNTS,
  availablePatientChoiceCounts,
  normalizeAdminChoiceMaximum,
  normalizePatientChoiceCount,
} from "../lib/choice-policy.ts";

test("exposes only the agreed patient choice counts", () => {
  assert.deepEqual(PATIENT_CHOICE_COUNTS, [2, 4, 6, 8, 10]);
});

test("limits patient options to the companion maximum", () => {
  assert.deepEqual(availablePatientChoiceCounts(6), [2, 4, 6]);
  assert.deepEqual(availablePatientChoiceCounts(10), [2, 4, 6, 8, 10]);
});

test("normalizes unexpected stored values without exceeding the maximum", () => {
  assert.equal(normalizeAdminChoiceMaximum(9), 8);
  assert.equal(normalizeAdminChoiceMaximum(undefined), 10);
  assert.equal(normalizePatientChoiceCount(10, 6), 6);
  assert.equal(normalizePatientChoiceCount(7, 10), 6);
  assert.equal(normalizePatientChoiceCount(undefined, 4), 4);
});

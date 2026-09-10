import test from "node:test";
import assert from "node:assert/strict";

import {
  PATIENT_CHOICE_COUNTS,
  availablePatientChoiceCounts,
  nextPatientChoiceCount,
  normalizeAdminChoiceMaximum,
  normalizePatientChoiceCount,
} from "../lib/choice-policy.ts";

test("exposes only the agreed patient choice counts", () => {
  assert.deepEqual(PATIENT_CHOICE_COUNTS, [2, 4, 6, 8, 10, 12]);
});

test("advances one tap at a time and loops within the companion maximum", () => {
  assert.equal(nextPatientChoiceCount(2, 12), 4);
  assert.equal(nextPatientChoiceCount(10, 12), 12);
  assert.equal(nextPatientChoiceCount(12, 12), 2);
  assert.equal(nextPatientChoiceCount(6, 6), 2);
});

test("limits patient options to the companion maximum", () => {
  assert.deepEqual(availablePatientChoiceCounts(6), [2, 4, 6]);
  assert.deepEqual(availablePatientChoiceCounts(12), [2, 4, 6, 8, 10, 12]);
});

test("normalizes unexpected stored values without exceeding the maximum", () => {
  assert.equal(normalizeAdminChoiceMaximum(9), 8);
  assert.equal(normalizeAdminChoiceMaximum(undefined), 12);
  assert.equal(normalizePatientChoiceCount(12, 6), 6);
  assert.equal(normalizePatientChoiceCount(7, 12), 6);
  assert.equal(normalizePatientChoiceCount(undefined, 4), 4);
});

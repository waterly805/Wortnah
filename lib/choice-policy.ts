export const PATIENT_CHOICE_COUNTS = [2, 4, 6, 8, 10, 12] as const;

export type PatientChoiceCount = (typeof PATIENT_CHOICE_COUNTS)[number];

export const DEFAULT_ADMIN_CHOICE_MAXIMUM: PatientChoiceCount = 12;

function finiteNumber(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizeAdminChoiceMaximum(value: unknown): PatientChoiceCount {
  const requested = finiteNumber(value);
  if (requested === null) return DEFAULT_ADMIN_CHOICE_MAXIMUM;

  return [...PATIENT_CHOICE_COUNTS]
    .reverse()
    .find((count) => count <= requested) ?? PATIENT_CHOICE_COUNTS[0];
}

export function availablePatientChoiceCounts(adminMaximum: unknown): PatientChoiceCount[] {
  const maximum = normalizeAdminChoiceMaximum(adminMaximum);
  return PATIENT_CHOICE_COUNTS.filter((count) => count <= maximum);
}

export function nextPatientChoiceCount(
  current: unknown,
  adminMaximum: unknown = DEFAULT_ADMIN_CHOICE_MAXIMUM,
): PatientChoiceCount {
  const available = availablePatientChoiceCounts(adminMaximum);
  const normalized = normalizePatientChoiceCount(current, adminMaximum);
  const index = available.indexOf(normalized);
  return available[(index + 1) % available.length] ?? PATIENT_CHOICE_COUNTS[0];
}

export function normalizePatientChoiceCount(
  value: unknown,
  adminMaximum: unknown = DEFAULT_ADMIN_CHOICE_MAXIMUM,
): PatientChoiceCount {
  const available = availablePatientChoiceCounts(adminMaximum);
  const requested = finiteNumber(value);
  if (requested === null) return available.at(-1) ?? PATIENT_CHOICE_COUNTS[0];

  return [...available]
    .reverse()
    .find((count) => count <= requested) ?? available[0] ?? PATIENT_CHOICE_COUNTS[0];
}

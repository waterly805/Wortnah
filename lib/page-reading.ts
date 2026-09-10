export type ReadableChoice = {
  id: string;
  label: string;
};

export type ReadingItem = {
  id: string;
  text: string;
};

export function buildConcisePageReading(
  heading: string,
  visibleChoices: ReadableChoice[],
): ReadingItem[] {
  const cleanHeading = heading.trim();
  const items = visibleChoices
    .map((choice) => ({ id: choice.id, text: choice.label.trim() }))
    .filter((choice) => choice.text.length > 0);

  return cleanHeading ? [{ id: "page", text: cleanHeading }, ...items] : items;
}

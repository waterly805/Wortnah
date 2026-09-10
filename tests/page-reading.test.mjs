import assert from "node:assert/strict";
import test from "node:test";

import { buildConcisePageReading } from "../lib/page-reading.ts";

test("reads only the heading followed by visible choice labels", () => {
  assert.deepEqual(buildConcisePageReading("Worum geht es?", [
    { id: "day", label: "Mein Tag" },
    { id: "family", label: "Familie und Menschen" },
    { id: "feeling", label: "Wie ich mich fühle" },
    { id: "health", label: "Gesundheit und Termine" },
  ]), [
    { id: "page", text: "Worum geht es?" },
    { id: "day", text: "Mein Tag" },
    { id: "family", text: "Familie und Menschen" },
    { id: "feeling", text: "Wie ich mich fühle" },
    { id: "health", text: "Gesundheit und Termine" },
  ]);
});

test("drops blank labels and never adds helper instructions or numbering", () => {
  assert.deepEqual(buildConcisePageReading("  Hauptfrage  ", [
    { id: "one", label: "  Erste Wahl " },
    { id: "blank", label: "   " },
  ]), [
    { id: "page", text: "Hauptfrage" },
    { id: "one", text: "Erste Wahl" },
  ]);
});

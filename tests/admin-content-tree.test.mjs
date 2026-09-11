import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../app/wortnah-app.tsx", import.meta.url), "utf8");
const cssSource = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("Admin communication lists are scoped to the selected tree branch", () => {
  const start = appSource.indexOf("const loadAdminChoices");
  const end = appSource.indexOf("const loadAdminTaxonomy", start);
  const flow = appSource.slice(start, end);

  assert.match(flow, /contentLevel === "topic"[\s\S]*eq\("purpose_key", selectedAdminPurposeKey\)/);
  assert.match(flow, /contentLevel === "detail"[\s\S]*eq\("purpose_key", selectedAdminPurposeKey\)\.eq\("topic_key", selectedAdminTopicKey\)/);
  assert.match(flow, /contentSearch\.trim\(\)[\s\S]*ilike\("label_de"/);
});

test("new Admin content inherits the selected live parent and confirms writes", () => {
  const editorStart = appSource.indexOf("const startChoiceEditor");
  const editorEnd = appSource.indexOf("const toggleChoicePublished", editorStart);
  const editorFlow = appSource.slice(editorStart, editorEnd);

  assert.match(editorFlow, /purpose_key: contentLevel === "purpose" \? "" : selectedAdminPurposeKey/);
  assert.match(editorFlow, /topic_key: contentLevel === "detail" \? selectedAdminTopicKey : ""/);
  assert.match(editorFlow, /update\(payload\)[\s\S]*select\("id"\)\.single\(\)/);
  assert.match(editorFlow, /insert\([\s\S]*select\("id"\)\.single\(\)/);
});

test("ordering is guarded, space scoped, and server confirmed", () => {
  const start = appSource.indexOf("const moveChoice");
  const end = appSource.indexOf("const deleteChoice", start);
  const flow = appSource.slice(start, end);

  assert.match(flow, /editorBusy \|\| contentSearch\.trim\(\)/);
  assert.equal((flow.match(/\.eq\("space_id", member\.space_id\)\.select\("id"\)\.single\(\)/g) ?? []).length, 2);
  assert.match(flow, /await loadAdminChoices\(\)/);
});

test("parents with child content cannot be silently deleted", () => {
  const start = appSource.indexOf("const deleteChoice");
  const end = appSource.indexOf("const startSearchEditor", start);
  const flow = appSource.slice(start, end);

  assert.match(flow, /select\("id", \{ count: "exact", head: true \}\)/);
  assert.match(flow, /eq\("purpose_key", item\.option_key\)/);
  assert.match(flow, /eq\("topic_key", item\.option_key\)/);
  assert.match(flow, /Verschieben oder löschen Sie diese zuerst/);
});

test("the Admin editor exposes level-specific navigation, copy, counts and folder drill-down", () => {
  for (const phrase of [
    "Bereich auswählen",
    "Thema auswählen",
    "In dieser Auswahl suchen",
    "Bereich hinzufügen",
    "Thema hinzufügen",
    "Wort oder Satz hinzufügen",
    "sichtbar",
    "ausgeblendet",
  ]) assert.match(appSource, new RegExp(phrase));

  assert.match(appSource, /setSelectedAdminTopicKey\(item\.option_key\); setContentLevel\("detail"\)/);
  assert.match(appSource, /adminContentPathStorageKey/);
  assert.match(cssSource, /\.content-branch-toolbar/);
  assert.match(cssSource, /@media\(max-width:820px\)[\s\S]*content-branch-toolbar/);
});

test("live communication refreshes through realtime and foreground revalidation", () => {
  assert.match(appSource, /postgres_changes/);
  assert.match(appSource, /window\.addEventListener\("focus", refreshCommunication\)/);
  assert.match(appSource, /document\.addEventListener\("visibilitychange", refreshVisibleCommunication\)/);
  assert.match(appSource, /window\.removeEventListener\("focus", refreshCommunication\)/);
});

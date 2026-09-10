import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../app/wortnah-app.tsx", import.meta.url), "utf8");
const pilotLoginSource = await readFile(new URL("../supabase/functions/pilot-login/index.ts", import.meta.url), "utf8");
const communicationSyncMigration = await readFile(new URL("../supabase/migrations/20260910205639_communication_live_sync.sql", import.meta.url), "utf8");

test("a successful profile login still requires the daily PIN", () => {
  const loginStart = appSource.indexOf("const handlePilotLogin");
  const loginEnd = appSource.indexOf("const setupCompanion", loginStart);
  const loginFlow = appSource.slice(loginStart, loginEnd);

  assert.match(loginFlow, /setPinMode\("unlock"\);\s*setView\("pin"\)/);
  assert.doesNotMatch(loginFlow, /setView\(activeMember\.role === "companion"/);
});

test("internet search history remains on the device", () => {
  const searchStart = appSource.indexOf("const chooseSearch");
  const searchEnd = appSource.indexOf("const chooseCommunication", searchStart);
  const searchFlow = appSource.slice(searchStart, searchEnd);

  assert.match(searchFlow, /setSearchHistory/);
  assert.match(searchFlow, /choice_confirm.+internet_search.+choice_id/s);
  assert.doesNotMatch(searchFlow, /query:\s*choice\[lang\]/);
});

test("recent private MP3 responses are reused during the active session", () => {
  assert.match(appSource, /privateAudioCache\s*=\s*useRef\(new Map<string, Blob>\(\)\)/);
  assert.match(appSource, /privateAudioCache\.current\.get\(cacheKey\)/);
  assert.match(appSource, /privateAudioCache\.current\.set\(cacheKey, result\.blob\)/);
});

test("automatic page reading is saved and uses the credit-free device voice", () => {
  assert.match(appSource, /select\("speech_enabled,auto_read_choices,/);
  assert.match(appSource, /savePreference\(\{ auto_read_choices: next \}\)/);
  const sequenceStart = appSource.indexOf("const readChoiceSequence");
  const sequenceEnd = appSource.indexOf("useEffect(() => {", sequenceStart);
  const sequence = appSource.slice(sequenceStart, sequenceEnd);
  assert.match(sequence, /SpeechSynthesisUtterance/);
  assert.match(sequence, /utterance\.onend = \(\) => readNext\(index \+ 1\)/);
  assert.match(sequence, /selectNaturalDeviceVoice/);
  assert.match(sequence, /buildConcisePageReading/);
  assert.doesNotMatch(sequence, /requestPrivateVoiceAudio/);
});

test("automatic reading excludes helper copy and follows the visible carousel page", () => {
  const autoReadStart = appSource.indexOf('if (view === "home")');
  const autoReadEnd = appSource.indexOf("useEffect(() => () =>", autoReadStart);
  const autoReadFlow = appSource.slice(autoReadStart, autoReadEnd);
  assert.match(autoReadFlow, /choices = visiblePageChoices/);
  assert.doesNotMatch(autoReadFlow, /t\.firstTap/);
  assert.match(appSource, /onVisibleChoicesChange=\{reportVisibleChoices\}/);
});

test("the header field control advances on one button tap", () => {
  assert.match(appSource, /const cyclePatientFieldCount/);
  assert.match(appSource, /nextPatientChoiceCount\(choiceCount, adminChoiceMaximum\)/);
  assert.match(appSource, /onClick=\{cyclePatientFieldCount\}/);
  assert.doesNotMatch(appSource, /<select value=\{choiceCount\}/);
});

test("profile and PIN checks cannot be submitted twice while loading", () => {
  const pinPadStart = appSource.indexOf("function PinPad");
  const pinPadEnd = appSource.indexOf("function ChoiceGrid", pinPadStart);
  const pinPad = appSource.slice(pinPadStart, pinPadEnd);
  assert.match(pinPad, /<form className="pin-card" onSubmit=/);
  assert.match(pinPad, /pin\.length !== 4 \|\| busy/);
  assert.doesNotMatch(pinPad, /setTimeout\(\(\) => onComplete/);
  assert.match(pinPad, /disabled=\{busy\}/);
  assert.doesNotMatch(pinPad, /onComplete=\{onComplete\}/);
  assert.match(pinPad, /const submittedPin = pin; setPin\(""\); onComplete\(submittedPin\)/);
  assert.match(appSource, /if \(!pilotProfile \|\| authBusy\) return/);
  assert.match(appSource, /if \(authBusy\) return/);
});

test("the current release exposes German only", () => {
  assert.doesNotMatch(appSource, /setLang/);
  assert.doesNotMatch(appSource, /Englisch \(optional\)/);
  assert.doesNotMatch(appSource, /Switch to English/);
});

test("companion content writes verify the affected row and preserve hidden English on edits", () => {
  const choiceStart = appSource.indexOf("const saveChoice");
  const choiceEnd = appSource.indexOf("const toggleChoicePublished", choiceStart);
  const choiceFlow = appSource.slice(choiceStart, choiceEnd);
  assert.match(choiceFlow, /update\(payload\).*select\("id"\)\.single\(\)/s);
  assert.doesNotMatch(choiceFlow.match(/const payload = \{[\s\S]*?\n    \};/)?.[0] ?? "", /label_en/);

  const searchStart = appSource.indexOf("const saveSearchNode");
  const searchEnd = appSource.indexOf("const toggleSearchPublished", searchStart);
  const searchFlow = appSource.slice(searchStart, searchEnd);
  assert.match(searchFlow, /update\(payload\).*select\("id"\)\.single\(\)/s);
  assert.doesNotMatch(searchFlow.match(/const payload = \{[\s\S]*?\n    \};/)?.[0] ?? "", /label_en|query_en/);
});

test("login clearly separates access code and daily PIN and supports Enter", () => {
  assert.match(appSource, /Schritt 1 von 2/);
  assert.match(appSource, /Schritt 2 von 2/);
  assert.match(appSource, /Zugang prüfen/);
  assert.match(appSource, /Tägliche PIN eingeben/);
  assert.match(appSource, /type="submit"/);
  assert.match(appSource, /event\.preventDefault\(\)/);
});

test("practice follows the same patient choice count through twelve", () => {
  assert.match(appSource, /practiceItems\.slice\(0, choiceCount\)/);
  assert.match(appSource, /fallbackItems\.slice\(0, choiceCount\)/);
  assert.doesNotMatch(appSource, /practiceItems\.slice\(0, Math\.max\(4, choiceCount\)\)/);
});

test("pilot login selects the canonical space instead of an arbitrary membership", () => {
  const membershipStart = appSource.indexOf("const getMembership");
  const membershipEnd = appSource.indexOf("const loadMessages", membershipStart);
  const membershipFlow = appSource.slice(membershipStart, membershipEnd);
  assert.match(membershipFlow, /preferredSpaceId/);
  assert.match(membershipFlow, /eq\("space_id", preferredSpaceId\)/);
  assert.match(membershipFlow, /order\("joined_at", \{ ascending: false \}\)/);
  assert.match(appSource, /getMembership\(authData\.session\.user\.id, typeof data\.space_id === "string"/);
  assert.match(pilotLoginSource, /space_id: selected\.space_id/);
});

test("communication choices use successful database results, including an empty level", () => {
  assert.match(appSource, /loadedChoiceLevels/);
  assert.match(appSource, /if \(loadedChoiceLevels\.purpose\) return customPurposes\.map\(toChoice\)/);
  assert.match(appSource, /if \(loadedChoiceLevels\.topic\) return customTopics\.map\(toChoice\)/);
  assert.match(appSource, /if \(loadedChoiceLevels\.detail\) return customDetails\.map\(toChoice\)/);
  assert.match(appSource, /if \(loadError\) return null/);
});

test("communication content refreshes across signed-in Admin and Werner screens", () => {
  assert.match(appSource, /channel\(`communication-content-\$\{member\.space_id\}`\)/);
  assert.match(appSource, /"postgres_changes", \{ event: "\*", schema: "public", table: "communication_custom_choices" \}/);
  assert.match(appSource, /removeChannel\(channel\)/);
  assert.match(appSource, /loadAdminChoices\(\)/);
  assert.match(appSource, /loadPatientChoices\("purpose"\)/);
});

test("the synchronization migration restores the official first level and recovers Admin rows", () => {
  for (const key of ["reply", "request", "ask", "tell", "express", "opinion"]) {
    assert.match(communicationSyncMigration, new RegExp(`\\('${key}',`));
  }
  assert.match(communicationSyncMigration, /old\.source_name = 'Wortnah Admin'/);
  assert.match(communicationSyncMigration, /'recovered_' \|\| replace\(recoverable\.id::text/);
  assert.match(communicationSyncMigration, /on conflict \(option_key\) do nothing/);
});

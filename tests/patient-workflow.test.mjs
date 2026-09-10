import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../app/wortnah-app.tsx", import.meta.url), "utf8");

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
  assert.doesNotMatch(sequence, /requestPrivateVoiceAudio/);
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

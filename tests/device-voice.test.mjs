import assert from "node:assert/strict";
import test from "node:test";
import { selectNaturalDeviceVoice } from "../lib/device-voice.ts";

test("prefers a natural exact-locale German voice over a robotic default", () => {
  const voices = [
    { name: "eSpeak Deutsch", lang: "de-DE", default: true, localService: true },
    { name: "Microsoft Katja Online (Natural)", lang: "de-DE", default: false, localService: false },
    { name: "Google US English", lang: "en-US", default: false, localService: false },
  ];
  assert.equal(selectNaturalDeviceVoice(voices, "de-DE", "auto")?.name, "Microsoft Katja Online (Natural)");
});

test("respects voice preference when a matching German voice is available", () => {
  const voices = [
    { name: "Microsoft Katja Online (Natural)", lang: "de-DE" },
    { name: "Microsoft Conrad Online (Natural)", lang: "de-DE" },
  ];
  assert.equal(selectNaturalDeviceVoice(voices, "de-DE", "male")?.name, "Microsoft Conrad Online (Natural)");
});

test("accepts another German locale before a non-German default", () => {
  const voices = [
    { name: "English Default", lang: "en-GB", default: true },
    { name: "Anna Premium", lang: "de-AT" },
  ];
  assert.equal(selectNaturalDeviceVoice(voices, "de-DE", "female")?.name, "Anna Premium");
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  isSupportedVoiceAudio,
  normalizeSpeechText,
  voiceAssetFingerprint,
  voiceAssetStoragePath,
} from "../lib/audio-contract.ts";

test("normalizes equivalent spoken phrases before fingerprinting", async () => {
  assert.equal(normalizeSpeechText("  Ich   brauche\nHilfe. "), "Ich brauche Hilfe.");
  const first = await voiceAssetFingerprint({ spaceId: "space-1", text: "Ich brauche Hilfe." });
  const second = await voiceAssetFingerprint({ spaceId: "space-1", text: "  Ich   brauche Hilfe. " });
  assert.equal(first, second);
  assert.match(first, /^[a-f0-9]{64}$/);
});

test("keeps audio private to the matching Wortnah space", async () => {
  const text = "Ich brauche Hilfe.";
  const first = await voiceAssetFingerprint({ spaceId: "space-1", text });
  const second = await voiceAssetFingerprint({ spaceId: "space-2", text });
  assert.notEqual(first, second);
  assert.equal(voiceAssetStoragePath("space-1", "voice-1", first), `space-1/voice-1/${first}.mp3`);
});

test("accepts only bounded MP3 uploads", () => {
  assert.equal(isSupportedVoiceAudio("audio/mpeg", 1), true);
  assert.equal(isSupportedVoiceAudio("audio/mpeg", 10 * 1024 * 1024), true);
  assert.equal(isSupportedVoiceAudio("audio/mpeg", 10 * 1024 * 1024 + 1), false);
  assert.equal(isSupportedVoiceAudio("audio/wav", 100), false);
});

test("manual import and runtime playback share one protected asset registry", async () => {
  const runtime = await readFile(new URL("../supabase/functions/wortnah-audio/index.ts", import.meta.url), "utf8");
  const importer = await readFile(new URL("../supabase/functions/wortnah-audio-import/index.ts", import.meta.url), "utf8");
  for (const source of [runtime, importer]) {
    assert.match(source, /wortnah-audio-v1/);
    assert.match(source, /voice_audio_assets/);
    assert.match(source, /wortnah-voice-audio/);
    assert.doesNotMatch(source, /ELEVENLABS_API_KEY2/);
    assert.doesNotMatch(source, /danny-ly-1890/);
  }
  assert.match(runtime, /generation_tier === 0 \? "manual" : "elevenlabs"/);
  assert.match(importer, /generation_tier: 0/);
});

import assert from "node:assert/strict";
import test from "node:test";
import { requestPrivateVoiceAudio } from "../lib/audio-playback.ts";

const request = { functionUrl: "https://example.test/wortnah-audio", accessToken: "token", spaceId: "space-1", text: "Ja" };

test("uses private server audio when the response is an audio stream", async () => {
  let receivedHeaders;
  const result = await requestPrivateVoiceAudio({
    ...request,
    publishableKey: "publishable-key",
    fetcher: async (_input, init) => {
      receivedHeaders = init.headers;
      return new Response(new Blob(["mp3"]), { headers: { "Content-Type": "audio/mpeg", "X-Wortnah-Audio-Mode": "manual" } });
    },
  });
  assert.equal(result.kind, "audio");
  if (result.kind === "audio") assert.equal(await result.blob.text(), "mp3");
  assert.equal(receivedHeaders.apikey, "publishable-key");
});

test("uses the device voice when the server explicitly asks for a fallback", async () => {
  const result = await requestPrivateVoiceAudio({
    ...request,
    fetcher: async () => new Response(JSON.stringify({ fallback: true }), { headers: { "Content-Type": "application/json", "X-Wortnah-Audio-Mode": "browser_fallback" } }),
  });
  assert.deepEqual(result, { kind: "device_fallback", reason: "browser_fallback" });
});

test("uses the device voice when the audio service cannot be reached", async () => {
  const result = await requestPrivateVoiceAudio({ ...request, fetcher: async () => { throw new Error("offline"); } });
  assert.deepEqual(result, { kind: "device_fallback", reason: "network_unavailable" });
});

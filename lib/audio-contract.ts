export const VOICE_AUDIO_BUCKET = "wortnah-voice-audio";
export const DEFAULT_GERMAN_VOICE_ID = "gVOibprogMfmHVVyo5r6";
export const DEFAULT_GERMAN_MODEL_ID = "eleven_flash_v2_5";

export type VoiceAudioSource = "manual" | "elevenlabs";

export type VoiceAssetIdentity = {
  spaceId: string;
  text: string;
  voiceId?: string;
  modelId?: string;
};

/** Normalizes only presentation differences; the resulting phrase remains human-readable. */
export function normalizeSpeechText(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/g, " ");
}

export function voiceAssetPayload({
  spaceId,
  text,
  voiceId = DEFAULT_GERMAN_VOICE_ID,
  modelId = DEFAULT_GERMAN_MODEL_ID,
}: VoiceAssetIdentity): string {
  const normalizedText = normalizeSpeechText(text);
  if (!spaceId.trim()) throw new Error("space_id_required");
  if (!normalizedText || normalizedText.length > 700) throw new Error("invalid_speech_text");

  return JSON.stringify(["wortnah-audio-v1", spaceId, voiceId, modelId, "de", normalizedText]);
}

export async function voiceAssetFingerprint(identity: VoiceAssetIdentity): Promise<string> {
  const encoded = new TextEncoder().encode(voiceAssetPayload(identity));
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function voiceAssetStoragePath(spaceId: string, voiceId: string, fingerprint: string): string {
  if (!/^[a-f0-9]{64}$/.test(fingerprint)) throw new Error("invalid_audio_fingerprint");
  return `${spaceId}/${voiceId}/${fingerprint}.mp3`;
}

export function isSupportedVoiceAudio(contentType: string, sizeBytes: number): boolean {
  return contentType === "audio/mpeg" && sizeBytes > 0 && sizeBytes <= 10 * 1024 * 1024;
}

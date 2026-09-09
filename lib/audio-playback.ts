export type AudioFallbackReason =
  | "browser_fallback"
  | "missing_audio"
  | "network_unavailable"
  | "unexpected_response";

export type PrivateAudioResponse =
  | { kind: "audio"; blob: Blob }
  | { kind: "device_fallback"; reason: AudioFallbackReason };

type AudioFetch = (input: string, init: RequestInit) => Promise<Response>;

export async function requestPrivateVoiceAudio({
  functionUrl,
  accessToken,
  spaceId,
  text,
  fetcher = fetch,
  publishableKey,
}: {
  functionUrl: string;
  accessToken: string;
  spaceId: string;
  text: string;
  fetcher?: AudioFetch;
  publishableKey?: string;
}): Promise<PrivateAudioResponse> {
  try {
    const response = await fetcher(functionUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(publishableKey ? { apikey: publishableKey } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ spaceId, text, voiceKind: "female" }),
    });

    const mode = response.headers.get("X-Wortnah-Audio-Mode");
    const contentType = response.headers.get("Content-Type") ?? "";
    if (response.ok && mode !== "browser_fallback" && contentType.includes("audio/")) {
      return { kind: "audio", blob: await response.blob() };
    }

    return { kind: "device_fallback", reason: mode === "browser_fallback" ? "browser_fallback" : "missing_audio" };
  } catch {
    return { kind: "device_fallback", reason: "network_unavailable" };
  }
}

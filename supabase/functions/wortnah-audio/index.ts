import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const APP_ORIGINS = new Set([
  "https://wortnah-app.danny-ly-1897.chatgpt.site",
  "https://wortnah-kommunikation.danny-ly-1897.chatgpt.site",
]);
const BUCKET = "wortnah-voice-audio";
const VOICE_ID = "gVOibprogMfmHVVyo5r6";
const MODEL_ID = "eleven_flash_v2_5";
const VOICE_SETTINGS = { stability: 0.62, similarity_boost: 0.86, style: 0.08, use_speaker_boost: true, speed: 0.9 };

function cors(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": APP_ORIGINS.has(origin) ? origin : "https://wortnah-app.danny-ly-1897.chatgpt.site",
    "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Expose-Headers": "X-Wortnah-Audio-Mode, X-Wortnah-Audio-Source",
    Vary: "Origin",
  };
}

function json(request: Request, body: Record<string, unknown>, status = 200, mode?: string) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(request), "Content-Type": "application/json", ...(mode ? { "X-Wortnah-Audio-Mode": mode } : {}) } });
}

function fallback(request: Request, reason: string) {
  return json(request, { ok: true, fallback: true, reason }, 200, "browser_fallback");
}

function normalizeText(text: string) {
  return text.normalize("NFC").trim().replace(/\s+/g, " ");
}

async function fingerprint(spaceId: string, text: string) {
  const payload = JSON.stringify(["wortnah-audio-v1", spaceId, VOICE_ID, MODEL_ID, "de", text]);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function looksLikeMp3(bytes: Uint8Array) {
  return bytes.length > 32 && ((bytes[0] === 73 && bytes[1] === 68 && bytes[2] === 51) || (bytes[0] === 255 && (bytes[1] & 224) === 224));
}

function audio(request: Request, bytes: Uint8Array, source: "manual" | "elevenlabs") {
  return new Response(bytes, { headers: { ...cors(request), "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=3600", "X-Wortnah-Audio-Mode": "private_audio", "X-Wortnah-Audio-Source": source } });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors(request) });
  if (request.method !== "POST") return json(request, { error: "method_not_allowed" }, 405);
  if (!APP_ORIGINS.has(request.headers.get("origin") ?? "")) return json(request, { error: "origin_not_allowed" }, 403);

  try {
    const body = await request.json() as { spaceId?: unknown; text?: unknown };
    const spaceId = typeof body.spaceId === "string" ? body.spaceId : "";
    const text = typeof body.text === "string" ? normalizeText(body.text) : "";
    const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    const url = Deno.env.get("SUPABASE_URL");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY");
    if (!spaceId || !text || text.length > 700 || !token || !url || !service) return fallback(request, "request_unavailable");

    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: user, error: authError } = await admin.auth.getUser(token);
    if (authError || !user.user) return json(request, { error: "authentication_required" }, 401);
    const { data: membership } = await admin.from("space_members").select("space_id").eq("space_id", spaceId).eq("profile_id", user.user.id).eq("is_active", true).maybeSingle();
    if (!membership) return json(request, { error: "space_access_required" }, 403);

    const textFingerprint = await fingerprint(spaceId, text);
    const path = `${spaceId}/${VOICE_ID}/${textFingerprint}.mp3`;
    const { data: asset } = await admin.from("voice_audio_assets").select("storage_path,generation_tier").eq("space_id", spaceId).eq("text_fingerprint", textFingerprint).eq("voice_id", VOICE_ID).maybeSingle();
    if (asset?.storage_path) {
      const { data: file } = await admin.storage.from(BUCKET).download(asset.storage_path);
      if (file) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (looksLikeMp3(bytes)) return audio(request, bytes, asset.generation_tier === 0 ? "manual" : "elevenlabs");
      }
    }

    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) return fallback(request, "provider_unavailable");
    const generated = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`, {
      method: "POST",
      signal: AbortSignal.timeout(7000),
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: MODEL_ID, language_code: "de", voice_settings: VOICE_SETTINGS }),
    });
    if (!generated.ok) return fallback(request, generated.status === 402 ? "no_credits" : generated.status === 429 ? "rate_limited" : "provider_unavailable");
    const bytes = new Uint8Array(await generated.arrayBuffer());
    if (!looksLikeMp3(bytes) || bytes.length > 10 * 1024 * 1024) return fallback(request, "invalid_provider_audio");

    const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: "audio/mpeg", cacheControl: "31536000", upsert: true });
    if (uploadError) return fallback(request, "cache_write_failed");
    const { error: registryError } = await admin.from("voice_audio_assets").upsert({
      space_id: spaceId, text_fingerprint: textFingerprint, text_de: text, voice_kind: "female", voice_id: VOICE_ID,
      storage_path: path, content_type: "audio/mpeg", character_count: text.length, generated_by: user.user.id,
      generation_tier: null, generation_rank: null, updated_at: new Date().toISOString(),
    }, { onConflict: "space_id,text_fingerprint,voice_id" });
    if (registryError) return fallback(request, "cache_write_failed");
    return audio(request, bytes, "elevenlabs");
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return fallback(request, timedOut ? "provider_timeout" : "unexpected_error");
  }
});

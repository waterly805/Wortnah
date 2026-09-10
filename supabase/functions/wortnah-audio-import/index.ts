import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const APP_ORIGINS = new Set([
  "https://wortnah-app.danny-ly-1897.chatgpt.site",
  "https://wortnah-kommunikation.danny-ly-1897.chatgpt.site",
  "https://www.wort-nah.com",
]);
const BUCKET = "wortnah-voice-audio";
const VOICE_ID = "gVOibprogMfmHVVyo5r6";
const MODEL_ID = "eleven_flash_v2_5";
const MAX_BYTES = 10 * 1024 * 1024;

function cors(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  return { "Access-Control-Allow-Origin": APP_ORIGINS.has(origin) ? origin : "https://wortnah-app.danny-ly-1897.chatgpt.site", "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json", Vary: "Origin" };
}

function out(request: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors(request) });
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

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors(request) });
  if (request.method !== "POST") return out(request, { error: "method_not_allowed" }, 405);
  if (!APP_ORIGINS.has(request.headers.get("origin") ?? "")) return out(request, { error: "origin_not_allowed" }, 403);

  try {
    const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    const url = Deno.env.get("SUPABASE_URL");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY");
    if (!token || !url || !service) return out(request, { error: "request_unavailable" }, 503);
    const form = await request.formData();
    const spaceId = typeof form.get("spaceId") === "string" ? String(form.get("spaceId")) : "";
    const text = typeof form.get("text") === "string" ? normalizeText(String(form.get("text"))) : "";
    const file = form.get("file");
    if (!spaceId || !text || text.length > 700 || !(file instanceof File)) return out(request, { error: "invalid_import" }, 400);
    if (file.type !== "audio/mpeg" || file.size <= 0 || file.size > MAX_BYTES) return out(request, { error: "invalid_mp3" }, 400);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!looksLikeMp3(bytes)) return out(request, { error: "invalid_mp3" }, 400);

    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: user, error: authError } = await admin.auth.getUser(token);
    if (authError || !user.user) return out(request, { error: "authentication_required" }, 401);
    const { data: membership } = await admin.from("space_members").select("space_id").eq("space_id", spaceId).eq("profile_id", user.user.id).eq("is_active", true).eq("role", "companion").maybeSingle();
    if (!membership) return out(request, { error: "companion_access_required" }, 403);

    const textFingerprint = await fingerprint(spaceId, text);
    const path = `${spaceId}/${VOICE_ID}/${textFingerprint}.mp3`;
    const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: "audio/mpeg", cacheControl: "31536000", upsert: true });
    if (uploadError) return out(request, { error: "storage_write_failed" }, 503);
    const { error: registryError } = await admin.from("voice_audio_assets").upsert({
      space_id: spaceId, text_fingerprint: textFingerprint, text_de: text, voice_kind: "female", voice_id: VOICE_ID,
      storage_path: path, content_type: "audio/mpeg", character_count: text.length, generated_by: user.user.id,
      generation_tier: 0, generation_rank: 0, updated_at: new Date().toISOString(),
    }, { onConflict: "space_id,text_fingerprint,voice_id" });
    if (registryError) return out(request, { error: "registry_write_failed" }, 503);
    return out(request, { ok: true, source: "manual", fingerprint: textFingerprint });
  } catch {
    return out(request, { error: "unexpected_error" }, 500);
  }
});

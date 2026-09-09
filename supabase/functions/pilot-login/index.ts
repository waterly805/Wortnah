import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const allowedOrigins = new Set([
  "https://wortnah-app.danny-ly-1897.chatgpt.site",
  "https://wortnah-kommunikation.danny-ly-1897.chatgpt.site",
]);
function cors(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://wortnah-app.danny-ly-1897.chatgpt.site",
    "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin",
  };
}
function response(request: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(request), "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((item) => item.toString(16).padStart(2, "0")).join("");
}
type PilotProfile = {
  profile_key: "werner" | "admin1" | "admin2";
  role: "user" | "companion"; label: string; auth_email: string;
  initial_pin_hash: string; profile_id: string | null; space_id: string | null;
};
async function provisionPilot(admin: ReturnType<typeof createClient>) {
  const { data: rawProfiles, error: profileError } = await admin.from("pilot_access_profiles")
    .select("profile_key,role,label,auth_email,initial_pin_hash,profile_id,space_id").order("profile_key");
  if (profileError || !rawProfiles || rawProfiles.length !== 3) throw new Error("pilot configuration unavailable");
  const profiles = rawProfiles as PilotProfile[];
  const { data: listed, error: userError } = await admin.auth.admin.listUsers({ page: 1, perPage: 50 });
  if (userError) throw userError;
  const existingByEmail = new Map((listed.users ?? []).map((user) => [user.email, user]));
  const profileIds = new Map<string, string>();
  for (const profile of profiles) {
    let user = existingByEmail.get(profile.auth_email);
    if (!user) {
      const { data, error } = await admin.auth.admin.createUser({ email: profile.auth_email, email_confirm: true,
        user_metadata: { display_name: profile.label, preferred_language: "de" }, app_metadata: { wortnah_profile: profile.profile_key } });
      if (error || !data.user) throw error ?? new Error("could not create pilot profile");
      user = data.user;
    }
    profileIds.set(profile.profile_key, user.id);
    const { error } = await admin.from("profiles").upsert({ id: user.id, display_name: profile.label,
      preferred_language: "de", timezone: "Europe/Berlin" }, { onConflict: "id" });
    if (error) throw error;
  }
  let spaceId = profiles.find((profile) => profile.space_id)?.space_id ?? null;
  const admin1Id = profileIds.get("admin1");
  if (!admin1Id) throw new Error("admin profile unavailable");
  if (!spaceId) {
    const { data, error } = await admin.from("communication_spaces").insert({ name: "Wortnah \u00b7 Werner",
      created_by: admin1Id, default_language: "de", timezone: "Europe/Berlin" }).select("id").single();
    if (error || !data) throw error ?? new Error("could not create communication space");
    spaceId = data.id;
  }
  const { error: membershipError } = await admin.from("space_members").upsert(profiles.map((profile) => ({
    space_id: spaceId, profile_id: profileIds.get(profile.profile_key)!, role: profile.role, label: profile.label, is_active: true,
  })), { onConflict: "space_id,profile_id" });
  if (membershipError) throw membershipError;
  const { error: settingsError } = await admin.from("space_settings").upsert({ space_id: spaceId, updated_by: admin1Id }, { onConflict: "space_id" });
  if (settingsError) throw settingsError;
  const { error: preferenceError } = await admin.from("profile_preferences").upsert(profiles.map((profile) => ({
    profile_id: profileIds.get(profile.profile_key)!, updated_by: admin1Id, choice_count: 4,
  })), { onConflict: "profile_id", ignoreDuplicates: true });
  if (preferenceError) throw preferenceError;
  const { error: accessError } = await admin.from("profile_access").upsert(profiles.map((profile) => ({
    profile_id: profileIds.get(profile.profile_key)!, pin_hash: profile.initial_pin_hash,
  })), { onConflict: "profile_id", ignoreDuplicates: true });
  if (accessError) throw accessError;
  for (const profile of profiles) {
    const { error } = await admin.from("pilot_access_profiles").update({
      profile_id: profileIds.get(profile.profile_key)!, space_id: spaceId,
    }).eq("profile_key", profile.profile_key);
    if (error) throw error;
  }
  return profiles.map((profile) => ({ ...profile, profile_id: profileIds.get(profile.profile_key)!, space_id: spaceId! }));
}
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors(request) });
  if (request.method !== "POST" || !allowedOrigins.has(request.headers.get("origin") ?? "")) return response(request, { error: "Not available" }, 403);
  try {
    const body = await request.json();
    const profileKey = body?.profile;
    if (!["werner", "admin1", "admin2"].includes(profileKey)) return response(request, { error: "Profil nicht verf\u00fcgbar." }, 400);
    const rawCode = typeof body?.code === "string" ? body.code.replace(/\s|-/g, "") : "";
    const rawPin = typeof body?.pin === "string" ? body.pin.replace(/\s/g, "") : "";
    const useAccessCode = /^\d{8}$/.test(rawCode);
    const usePin = /^\d{4}$/.test(rawPin);
    if (!useAccessCode && !usePin) return response(request, { error: "Bitte pr\u00fcfen Sie den Zugangscode oder die vierstellige PIN." }, 400);
    const ip = (request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown").trim();
    const fingerprint = await sha256(`${profileKey}|${ip}`);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
    const verification = useAccessCode
      ? await admin.rpc("verify_pilot_access_code", { p_profile_key: profileKey, p_code: rawCode, p_fingerprint_hash: fingerprint })
      : await admin.rpc("verify_pilot_access_pin", { p_profile_key: profileKey, p_pin: rawPin, p_fingerprint_hash: fingerprint });
    if (verification.error || !verification.data) return response(request, { error: useAccessCode ? "Zugangscode nicht korrekt oder kurzzeitig gesperrt." : "PIN nicht korrekt oder kurzzeitig gesperrt." }, 401);
    const profiles = await provisionPilot(admin);
    const selected = profiles.find((profile) => profile.profile_key === profileKey);
    if (!selected) throw new Error("pilot profile unavailable");
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email: selected.auth_email });
    const tokenHash = link?.properties?.hashed_token;
    if (linkError || !tokenHash) throw linkError ?? new Error("could not create session");
    return response(request, { token_hash: tokenHash, profile: selected.profile_key });
  } catch (error) {
    console.error("pilot login failed", error instanceof Error ? error.message : "unknown");
    return response(request, { error: "Anmeldung im Moment nicht m\u00f6glich. Bitte erneut versuchen." }, 500);
  }
});

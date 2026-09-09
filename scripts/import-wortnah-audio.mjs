import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const supabaseUrl = "https://dffmqcqidqkbqeorjtlb.supabase.co";
const siteOrigin = "https://wortnah-app.danny-ly-1897.chatgpt.site";
const targetSpaceId = "317579c9-9b2e-42fb-8713-832edbc25556";
const accessCode = process.env.WORTNAH_ADMIN_ACCESS_CODE
  ?.normalize("NFKC")
  .replace(/[^0-9]/g, "");
const manifestPath = new URL("../audio-import/wortnah-audio-intake-manifest.json", import.meta.url);
const audioRoot = new URL("../audio-import/ElevenLabs-Audio/", import.meta.url);
const supabaseSource = await readFile(new URL("../lib/supabase.ts", import.meta.url), "utf8");
const publishableKey = supabaseSource.match(/supabasePublishableKey = "([^"]+)"/)?.[1];
const validateOnly = process.argv.includes("--validate-only");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const assets = manifest.assets.filter((asset) => asset.reviewed && asset.textDe);

if (assets.length !== 180) {
  throw new Error(`Expected 180 reviewed clips, found ${assets.length}.`);
}

async function readValidatedAsset(asset) {
  const bytes = await readFile(new URL(asset.relativePath, audioRoot));
  const checksum = createHash("sha256").update(bytes).digest("hex");
  if (checksum !== asset.sha256 || bytes.byteLength !== asset.byteSize) {
    throw new Error(`${asset.filename}: local checksum or file size changed`);
  }
  return bytes;
}

if (validateOnly) {
  await Promise.all(assets.map((asset) => readValidatedAsset(asset)));
  console.log(`Validated ${assets.length} reviewed MP3 files.`);
  process.exit(0);
}

if (!/^\d{4}$/.test(accessCode ?? "")) {
  throw new Error("WORTNAH_ADMIN_ACCESS_CODE must contain the four-digit Admin 1 code.");
}
if (!publishableKey) {
  throw new Error("The public Supabase project key could not be read from lib/supabase.ts.");
}

async function jsonResponse(response, label) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${label} failed (${response.status}): ${body.error ?? "unknown error"}`);
  }
  return body;
}

const pilotResponse = await fetch(`${supabaseUrl}/functions/v1/pilot-login`, {
  method: "POST",
  headers: { apikey: publishableKey, "Content-Type": "application/json", Origin: siteOrigin },
  body: JSON.stringify({ profile: "admin1", pin: accessCode }),
});
const pilot = await jsonResponse(pilotResponse, "Admin login");

const verificationResponse = await fetch(`${supabaseUrl}/auth/v1/verify`, {
  method: "POST",
  headers: { apikey: publishableKey, "Content-Type": "application/json" },
  body: JSON.stringify({ token_hash: pilot.token_hash, type: "magiclink" }),
});
const verification = await jsonResponse(verificationResponse, "Session verification");
const accessToken = verification.access_token;
const profileId = verification.user?.id;
if (!accessToken || !profileId) throw new Error("Admin session was not returned.");

const authHeaders = { apikey: publishableKey, Authorization: `Bearer ${accessToken}` };
const membershipResponse = await fetch(
  `${supabaseUrl}/rest/v1/space_members?space_id=eq.${encodeURIComponent(targetSpaceId)}&profile_id=eq.${encodeURIComponent(profileId)}&role=eq.companion&is_active=eq.true&select=space_id&limit=1`,
  { headers: authHeaders },
);
const membership = await jsonResponse(membershipResponse, "Companion membership");
const spaceId = membership[0]?.space_id;
if (!spaceId) throw new Error("Admin 1 is not an active companion.");

const pinResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/verify_access_pin`, {
  method: "POST",
  headers: { ...authHeaders, "Content-Type": "application/json" },
  body: JSON.stringify({ p_pin: accessCode }),
});
const pinVerified = await jsonResponse(pinResponse, "Daily PIN verification");
if (pinVerified !== true) throw new Error("The Admin 1 daily PIN was not accepted.");

let nextIndex = 0;
let imported = 0;
const failures = [];

async function importNext() {
  while (true) {
    const index = nextIndex;
    nextIndex += 1;
    if (index >= assets.length) return;
    const asset = assets[index];
    try {
      const bytes = await readValidatedAsset(asset);

      const form = new FormData();
      form.set("spaceId", spaceId);
      form.set("text", asset.textDe);
      form.set("file", new Blob([bytes], { type: "audio/mpeg" }), asset.filename);
      const importResponse = await fetch(`${supabaseUrl}/functions/v1/wortnah-audio-import`, {
        method: "POST",
        headers: { ...authHeaders, Origin: siteOrigin },
        body: form,
      });
      await jsonResponse(importResponse, asset.filename);
      imported += 1;
      if (imported % 10 === 0 || imported === assets.length) {
        console.log(`Imported ${imported}/${assets.length}`);
      }
    } catch (error) {
      failures.push({ file: asset.filename, error: error instanceof Error ? error.message : "unknown error" });
    }
  }
}

await Promise.all(Array.from({ length: 4 }, () => importNext()));
if (failures.length) {
  for (const failure of failures) console.error(`${failure.file}: ${failure.error}`);
  throw new Error(`${failures.length} audio file(s) failed. Rerun the import after correcting the reported problem.`);
}
console.log(`Audio import complete: ${imported} approved MP3 files.`);

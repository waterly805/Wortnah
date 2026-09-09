import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const [manifestPath, spaceId] = process.argv.slice(2);
const voiceId = "gVOibprogMfmHVVyo5r6";
const modelId = "eleven_flash_v2_5";
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const assets = manifest.assets.filter((asset) => asset.reviewed && asset.textDe);

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const rows = assets.map((asset) => {
  const text = asset.textDe.normalize("NFC").trim().replace(/\s+/g, " ");
  const payload = JSON.stringify(["wortnah-audio-v1", spaceId, voiceId, modelId, "de", text]);
  const fingerprint = createHash("sha256").update(payload).digest("hex");
  const path = `${spaceId}/${voiceId}/${fingerprint}.mp3`;
  return `(${quote(spaceId)}::uuid,${quote(fingerprint)},${quote(text)},'female',${quote(voiceId)},${quote(path)},'audio/mpeg',${[...text].length},null,0,0,now())`;
});

const batches = [];
for (let index = 0; index < rows.length; index += 60) {
  batches.push(`insert into public.voice_audio_assets
    (space_id,text_fingerprint,text_de,voice_kind,voice_id,storage_path,content_type,character_count,generated_by,generation_tier,generation_rank,updated_at)
    values ${rows.slice(index, index + 60).join(",\n")}
    on conflict (space_id,text_fingerprint,voice_id) do update set
      text_de=excluded.text_de,
      storage_path=excluded.storage_path,
      content_type=excluded.content_type,
      character_count=excluded.character_count,
      generation_tier=excluded.generation_tier,
      generation_rank=excluded.generation_rank,
      updated_at=excluded.updated_at;`);
}

process.stdout.write(JSON.stringify(batches));

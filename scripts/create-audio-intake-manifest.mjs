import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const inputDirectory = process.argv[2] ?? "audio-import/ElevenLabs-Audio";
const outputFile = process.argv[3] ?? "audio-import/wortnah-audio-intake-manifest.json";

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) return filesIn(fullPath);
    return entry.isFile() && entry.name.toLowerCase().endsWith(".mp3") ? [fullPath] : [];
  }));
  return nested.flat();
}

const files = (await filesIn(inputDirectory)).sort();
const assets = await Promise.all(files.map(async (path) => {
  const bytes = await readFile(path);
  const details = await stat(path);
  return {
    relativePath: relative(inputDirectory, path),
    filename: path.split("/").at(-1),
    section: relative(inputDirectory, path).split("/")[0],
    byteSize: details.size,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    textDe: null,
    reviewed: false,
  };
}));

await writeFile(outputFile, `${JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), assets }, null, 2)}\n`);
console.log(`manifest_assets=${assets.length}`);

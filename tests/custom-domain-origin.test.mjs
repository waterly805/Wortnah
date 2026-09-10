import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const functionFiles = [
  "../supabase/functions/pilot-login/index.ts",
  "../supabase/functions/wortnah-audio/index.ts",
  "../supabase/functions/wortnah-audio-import/index.ts",
];

test("every browser Edge Function accepts the public custom domain", async () => {
  for (const file of functionFiles) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    assert.match(source, /"https:\/\/www\.wort-nah\.com"/);
    assert.match(source, /Access-Control-Allow-Origin/);
    assert.match(source, /OPTIONS/);
  }
});

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("the circular Wortnah logo is used in the app and install metadata", async () => {
  await access(new URL("../public/wortnah-logo-round.png", import.meta.url));
  await access(new URL("../public/wortnah-logo-round-192.png", import.meta.url));
  const app = await readFile(new URL("../app/wortnah-app.tsx", import.meta.url), "utf8");
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const manifest = await readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8");
  assert.match(app, /wordmark-logo.+wortnah-logo-round\.png/);
  assert.match(layout, /wortnah-logo-round-192\.png/);
  assert.match(manifest, /wortnah-logo-round\.png/);
});

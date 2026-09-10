import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { childrenOf, fallbackInternetSearchNodes } from "../lib/internet-search.ts";

const manifest = JSON.parse(await readFile(new URL("../audio-import/wortnah-audio-intake-manifest.json", import.meta.url), "utf8"));

test("guided Internet search has complete, valid levels one through four", () => {
  const keys = new Set(fallbackInternetSearchNodes.map((node) => node.option_key));
  assert.equal(keys.size, fallbackInternetSearchNodes.length);
  assert.deepEqual([...new Set(fallbackInternetSearchNodes.map((node) => node.search_level))], [1, 2, 3, 4]);
  for (const node of fallbackInternetSearchNodes) {
    if (node.search_level === 1) assert.equal(node.parent_key, null);
    else assert.ok(node.parent_key && keys.has(node.parent_key), `${node.option_key} has a valid parent`);
    const hasChildren = childrenOf(fallbackInternetSearchNodes, node.option_key).length > 0;
    if (!hasChildren) assert.ok(node.query_de, `${node.option_key} has a final German query`);
  }
});

test("all reviewed Internet-search MP3 phrases are used exactly once", () => {
  const approved = manifest.assets.filter((asset) => asset.section === "s05" && asset.reviewed).map((asset) => asset.textDe).sort();
  const queries = fallbackInternetSearchNodes.filter((node) => node.query_de).map((node) => node.query_de).sort();
  assert.equal(queries.length, 36);
  assert.deepEqual(queries, approved);
});

test("patient search confirms each level and keeps full query text out of activity metadata", async () => {
  const source = await readFile(new URL("../app/wortnah-app.tsx", import.meta.url), "utf8");
  const start = source.indexOf("const chooseSearch");
  const end = source.indexOf("const chooseCommunication", start);
  const flow = source.slice(start, end);
  assert.match(flow, /nextNodes\.length/);
  assert.match(flow, /setSearchPath/);
  assert.match(flow, /window\.open/);
  assert.doesNotMatch(flow, /metadata[^\n]*query/);
  assert.doesNotMatch(flow, /speakWithDevice/);
  assert.match(flow, /speak\(preview/);
});

import { readFile, writeFile } from "node:fs/promises";

const phrases = {
  "s02-001-wasser-mit-kohlensaeure.mp3": "Ich möchte Wasser mit Kohlensäure.",
  "s02-002-tasse-kaffee.mp3": "Ich möchte eine Tasse Kaffee.",
  "s02-003-tasse-tee.mp3": "Ich möchte eine Tasse Tee.",
  "s02-004-glas-saft.mp3": "Ich möchte ein Glas Saft.",
  "s02-005-etwas-warmes-trinken.mp3": "Ich möchte etwas Warmes trinken.",
  "s02-006-etwas-kaltes-trinken.mp3": "Ich möchte etwas Kaltes trinken.",
  "s02-007-getraenk-naeher-zu-mir.mp3": "Bitte stellen Sie das Getränk näher zu mir.",
  "s02-008-flasche-oeffnen.mp3": "Bitte öffnen Sie die Flasche.",
  "s02-009-trinkhalm.mp3": "Ich brauche einen Trinkhalm.",
  "s02-010-fruehstuecken.mp3": "Ich möchte frühstücken.",
  "s02-011-zu-mittag-essen.mp3": "Ich möchte zu Mittag essen.",
  "s02-012-zu-abend-essen.mp3": "Ich möchte zu Abend essen.",
  "s02-013-kleine-mahlzeit.mp3": "Ich möchte eine kleine Mahlzeit.",
  "s02-014-obst-essen.mp3": "Ich möchte Obst essen.",
  "s02-015-belegtes-brot.mp3": "Ich möchte ein belegtes Brot.",
  "s02-016-essen-kleiner-schneiden.mp3": "Bitte schneiden Sie mein Essen kleiner.",
  "s02-017-hilfe-beim-essen.mp3": "Bitte helfen Sie mir beim Essen.",
  "s02-018-was-zu-essen-gibt.mp3": "Bitte zeigen Sie mir, was es zu essen gibt.",
  "s02-019-duschen.mp3": "Ich möchte duschen.",
  "s02-020-waschen.mp3": "Ich möchte mich waschen.",
  "s02-021-zaehneputzen.mp3": "Ich möchte Zähne putzen.",
  "s02-022-haarewaschen.mp3": "Ich möchte Haare waschen.",
  "s02-023-anziehen.mp3": "Ich möchte mich anziehen.",
  "s02-024-frische-kleidung.mp3": "Ich möchte frische Kleidung.",
  "s02-025-handtuch.mp3": "Ich brauche ein Handtuch.",
  "s02-026-privatsphaere.mp3": "Bitte achten Sie auf meine Privatsphäre.",
  "s02-027-mehr-zeit-im-bad.mp3": "Ich brauche mehr Zeit im Bad.",
  "s02-028-hinsetzen.mp3": "Ich möchte mich hinsetzen.",
  "s02-029-decke.mp3": "Ich brauche eine Decke.",
  "s02-030-fenster-oeffnen.mp3": "Bitte öffnen Sie das Fenster.",
  "s02-031-fenster-schliessen.mp3": "Bitte schließen Sie das Fenster.",
  "s02-032-licht-heller.mp3": "Bitte machen Sie das Licht heller.",
  "s02-033-licht-dunkler.mp3": "Bitte machen Sie das Licht dunkler.",
  "s02-034-bequemer-sitzen.mp3": "Ich möchte bequemer sitzen.",
  "s02-035-gehstock.mp3": "Ich brauche einen Gehstock.",
  "s02-036-rollator.mp3": "Ich brauche einen Rollator.",
};

const manifestPath = "audio-import/wortnah-audio-intake-manifest.json";
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
for (const asset of manifest.assets) {
  if (phrases[asset.filename]) { asset.textDe = phrases[asset.filename]; asset.reviewed = true; }
}
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`reviewed_assets=${manifest.assets.filter((asset) => asset.reviewed).length}`);

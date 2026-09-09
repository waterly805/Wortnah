import { readFile, writeFile } from "node:fs/promises";

const phrases = {
  "s01-001-ja.mp3": "Ja",
  "s01-002-nein.mp3": "Nein",
  "s01-003-vielleicht.mp3": "Vielleicht",
  "s01-004-ich-weiss-es-nicht.mp3": "Ich weiß es nicht.",
  "s01-005-ich-bin-mir-nicht-sicher.mp3": "Ich bin mir nicht sicher.",
  "s01-006-ich-habe-das-verstanden.mp3": "Ich habe das verstanden.",
  "s01-007-ich-habe-das-noch-nicht-verstanden.mp3": "Ich habe das noch nicht verstanden.",
  "s01-008-bitte-sagen-sie-das-noch-einmal.mp3": "Bitte sagen Sie das noch einmal.",
  "s01-009-bitte-sprechen-sie-langsamer.mp3": "Bitte sprechen Sie langsamer.",
  "s01-010-bitte-erklaeren-sie-es-einfacher.mp3": "Bitte erklären Sie es einfacher.",
  "s01-011-bitte-geben-sie-mir-mehr-zeit.mp3": "Bitte geben Sie mir mehr Zeit.",
  "s01-012-bitte-warten-sie-einen-moment.mp3": "Bitte warten Sie einen Moment.",
  "s01-013-ich-brauche-eine-kurze-pause.mp3": "Ich brauche eine kurze Pause.",
  "s01-014-ich-moechte-jetzt-weitermachen.mp3": "Ich möchte jetzt weitermachen.",
  "s01-015-ich-moechte-spaeter-antworten.mp3": "Ich möchte später antworten.",
  "s01-016-ich-moechte-meine-antwort-aendern.mp3": "Ich möchte meine Antwort ändern.",
  "s01-017-bitte-fragen-sie-mich-direkt.mp3": "Bitte fragen Sie mich direkt.",
  "s01-018-bitte-stellen-sie-nur-eine-frage-auf-einmal.mp3": "Bitte stellen Sie nur eine Frage auf einmal.",
  "s01-019-bitte-zeigen-sie-mir-was-sie-meinen.mp3": "Bitte zeigen Sie mir, was Sie meinen.",
  "s01-020-ich-brauche-hilfe-beim-ausdruecken.mp3": "Ich brauche Hilfe beim Ausdrücken.",
  "s01-021-ich-moechte-bitte-ein-glas-wasser.mp3": "Ich möchte bitte ein Glas Wasser.",
  "s01-022-ich-habe-durst.mp3": "Ich habe Durst.",
  "s01-023-ich-moechte-jetzt-etwas-trinken.mp3": "Ich möchte jetzt etwas trinken.",
  "s01-024-ich-habe-hunger.mp3": "Ich habe Hunger.",
  "s01-025-ich-moechte-jetzt-etwas-essen.mp3": "Ich möchte jetzt etwas essen.",
  "s01-026-ich-moechte-bitte-zur-toilette.mp3": "Ich möchte bitte zur Toilette.",
  "s01-027-bitte-helfen-sie-mir-beim-aufstehen.mp3": "Bitte helfen Sie mir beim Aufstehen.",
  "s01-028-ich-moechte-mich-bitte-hinlegen.mp3": "Ich möchte mich bitte hinlegen.",
  "s01-029-ich-moechte-bitte-etwas-ruhe.mp3": "Ich möchte bitte etwas Ruhe.",
  "s01-030-bitte-helfen-sie-mir-wegen-meiner-schmerzen.mp3": "Bitte helfen Sie mir wegen meiner Schmerzen.",
  "s01-031-ich-habe-kopfschmerzen.mp3": "Ich habe Kopfschmerzen.",
  "s01-032-mir-ist-schwindelig.mp3": "Mir ist schwindelig.",
  "s01-033-mir-ist-zu-kalt.mp3": "Mir ist zu kalt.",
  "s01-034-mir-ist-zu-warm.mp3": "Mir ist zu warm.",
  "s01-035-bitte-holen-sie-sofort-hilfe.mp3": "Bitte holen Sie sofort Hilfe.",
  "s01-036-bitte-bleiben-sie-ruhig-bei-mir.mp3": "Bitte bleiben Sie ruhig bei mir.",
};

const manifestPath = "audio-import/wortnah-audio-intake-manifest.json";
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
for (const asset of manifest.assets) {
  if (phrases[asset.filename]) { asset.textDe = phrases[asset.filename]; asset.reviewed = true; }
}
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`reviewed_assets=${manifest.assets.filter((asset) => asset.reviewed).length}`);

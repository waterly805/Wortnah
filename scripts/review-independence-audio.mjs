import { readFile, writeFile } from "node:fs/promises";

const phrases = {
  "s04-001-ich-stimme-nicht-zu.mp3": "Ich stimme nicht zu.",
  "s04-002-damit-bin-ich-einverstanden.mp3": "Damit bin ich einverstanden.",
  "s04-003-damit-bin-ich-nicht-einverstanden.mp3": "Damit bin ich nicht einverstanden.",
  "s04-004-diese-moeglichkeit-passt-fuer-mich.mp3": "Diese Möglichkeit passt für mich.",
  "s04-005-diese-moeglichkeit-passt-nicht-fuer-mich.mp3": "Diese Möglichkeit passt nicht für mich.",
  "s04-006-ich-moechte-lieber-die-andere-moeglichkeit.mp3": "Ich möchte lieber die andere Möglichkeit.",
  "s04-007-ich-moechte-nichts-davon-auswaehlen.mp3": "Ich möchte nichts davon auswählen.",
  "s04-008-ich-moechte-gemeinsam-entscheiden.mp3": "Ich möchte gemeinsam entscheiden.",
  "s04-009-das-entscheide-ich-selbst.mp3": "Das entscheide ich selbst.",
  "s04-010-bitte-beruecksichtigen-sie-meine-meinung.mp3": "Bitte berücksichtigen Sie meine Meinung.",
  "s04-011-bitte-sprechen-sie-direkt-mit-mir.mp3": "Bitte sprechen Sie direkt mit mir.",
  "s04-012-bitte-sprechen-sie-nicht-ueber-mich.mp3": "Bitte sprechen Sie nicht über mich, wenn ich dabei bin.",
  "s04-013-bitte-lassen-sie-mich-selbst-antworten.mp3": "Bitte lassen Sie mich selbst antworten.",
  "s04-014-bitte-entscheiden-sie-nicht-ohne-mich.mp3": "Bitte entscheiden Sie nicht ohne mich.",
  "s04-015-diese-information-ist-privat.mp3": "Diese Information ist privat.",
  "s04-016-ich-moechte-darueber-nicht-sprechen.mp3": "Ich möchte darüber nicht sprechen.",
  "s04-017-ich-moechte-jetzt-allein-sein.mp3": "Ich möchte jetzt allein sein.",
  "s04-018-bitte-fragen-sie-mich-bevor-sie-helfen.mp3": "Bitte fragen Sie mich, bevor Sie helfen.",
  "s04-019-danke-fuer-ihre-hilfe.mp3": "Danke für Ihre Hilfe.",
  "s04-020-ich-freue-mich-dass-sie-da-sind.mp3": "Ich freue mich, dass Sie da sind.",
  "s04-021-partnerin-oder-partner-anrufen.mp3": "Bitte rufen Sie meine Partnerin oder meinen Partner an.",
  "s04-022-familienmitglied-anrufen.mp3": "Bitte rufen Sie ein Familienmitglied an.",
  "s04-023-familie-kurze-nachricht.mp3": "Bitte schicken Sie meiner Familie eine kurze Nachricht.",
  "s04-024-besuch-anfragen.mp3": "Bitte fragen Sie, ob jemand mich besuchen kann.",
  "s04-025-hilfe-selbst-anzurufen.mp3": "Bitte helfen Sie mir, selbst anzurufen.",
  "s04-026-antwort-vorlesen.mp3": "Bitte lesen Sie mir die Antwort vor.",
  "s04-027-meine-worte-genau-weitergeben.mp3": "Bitte geben Sie meine Worte genau so weiter.",
  "s04-028-handy-bringen.mp3": "Bitte bringen Sie mir mein Handy.",
  "s04-029-handy-aufladen.mp3": "Bitte laden Sie mein Handy auf.",
  "s04-030-nachrichten-oeffnen.mp3": "Bitte öffnen Sie meine Nachrichten.",
  "s04-031-hilfe-beim-videoanruf.mp3": "Bitte helfen Sie mir bei einem Videoanruf.",
  "s04-032-bestimmte-sendung-suchen.mp3": "Bitte suchen Sie eine bestimmte Sendung.",
  "s04-033-etwas-suchen.mp3": "Bitte helfen Sie mir, etwas zu suchen.",
  "s04-034-geraet-mit-internet-verbinden.mp3": "Bitte verbinden Sie das Gerät mit dem Internet.",
  "s04-035-kamera-oeffnen.mp3": "Bitte öffnen Sie die Kamera.",
  "s04-036-fotos-zeigen.mp3": "Bitte zeigen Sie mir die Fotos.",
};

const manifestPath = "audio-import/wortnah-audio-intake-manifest.json";
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
for (const asset of manifest.assets) {
  if (phrases[asset.filename]) { asset.textDe = phrases[asset.filename]; asset.reviewed = true; }
}
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`reviewed_assets=${manifest.assets.filter((asset) => asset.reviewed).length}`);

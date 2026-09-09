import { readFile, writeFile } from "node:fs/promises";

const phrases = {
  "s05-001-wetter-heute.mp3": "Wie wird das Wetter heute?",
  "s05-002-wetter-morgen.mp3": "Wie wird das Wetter morgen?",
  "s05-003-temperatur-heute.mp3": "Wie warm wird es heute?",
  "s05-004-regnet-es.mp3": "Regnet es heute?",
  "s05-005-wetter-am-wochenende.mp3": "Wie wird das Wetter am Wochenende?",
  "s05-006-nachrichten-heute.mp3": "Was sind die Nachrichten von heute?",
  "s05-007-nachrichten-aus-deutschland.mp3": "Was gibt es Neues aus Deutschland?",
  "s05-008-sportnachrichten.mp3": "Was gibt es Neues im Sport?",
  "s05-009-fernsehprogramm-heute.mp3": "Was läuft heute im Fernsehen?",
  "s05-010-sendung-finden.mp3": "Wann läuft meine Sendung?",
  "s05-011-film-finden.mp3": "Ich möchte einen Film finden.",
  "s05-012-serie-finden.mp3": "Ich möchte eine Serie finden.",
  "s05-013-musik-finden.mp3": "Ich möchte Musik hören.",
  "s05-014-video-finden.mp3": "Ich möchte ein Video ansehen.",
  "s05-015-radio-hoeren.mp3": "Ich möchte Radio hören.",
  "s05-016-rezept-finden.mp3": "Ich möchte ein Rezept finden.",
  "s05-017-speise-finden.mp3": "Wie koche ich dieses Gericht?",
  "s05-018-oeffnungszeiten.mp3": "Wann hat dieses Geschäft geöffnet?",
  "s05-019-adresse-finden.mp3": "Wie lautet die Adresse?",
  "s05-020-telefonnummer-finden.mp3": "Wie lautet die Telefonnummer?",
  "s05-021-weg-finden.mp3": "Wie komme ich dorthin?",
  "s05-022-busverbindung.mp3": "Wann fährt der nächste Bus?",
  "s05-023-bahnverbindung.mp3": "Wann fährt der nächste Zug?",
  "s05-024-fahrplan.mp3": "Ich möchte den Fahrplan sehen.",
  "s05-025-arzt-finden.mp3": "Ich möchte eine Arztpraxis finden.",
  "s05-026-apotheke-finden.mp3": "Wo ist die nächste Apotheke?",
  "s05-027-notdienst-apotheke.mp3": "Welche Apotheke hat Notdienst?",
  "s05-028-uebersetzung.mp3": "Bitte übersetze dieses Wort.",
  "s05-029-bedeutung-wort.mp3": "Was bedeutet dieses Wort?",
  "s05-030-bilder-ansehen.mp3": "Ich möchte Bilder dazu sehen.",
  "s05-031-grosse-schrift.mp3": "Bitte zeige die Ergebnisse in großer Schrift.",
  "s05-032-vorlesen.mp3": "Bitte lies mir die Ergebnisse vor.",
  "s05-033-weiterlesen.mp3": "Bitte lies weiter.",
  "s05-034-einfach-erklaeren.mp3": "Bitte erkläre das einfach.",
  "s05-035-noch-einmal-suchen.mp3": "Bitte suche noch einmal.",
  "s05-036-andere-ergebnisse.mp3": "Bitte zeige andere Ergebnisse.",
};

const manifestPath = "audio-import/wortnah-audio-intake-manifest.json";
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
for (const asset of manifest.assets) {
  if (phrases[asset.filename]) {
    asset.textDe = phrases[asset.filename];
    asset.reviewed = true;
  }
}
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`reviewed_assets=${manifest.assets.filter((asset) => asset.reviewed).length}`);

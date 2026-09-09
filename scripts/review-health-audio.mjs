import { readFile, writeFile } from "node:fs/promises";

const phrases = {
  "s03-001-schmerzen-im-nacken.mp3": "Ich habe Schmerzen im Nacken.",
  "s03-002-schmerzen-in-der-schulter.mp3": "Ich habe Schmerzen in der Schulter.",
  "s03-003-schmerzen-im-arm.mp3": "Ich habe Schmerzen im Arm.",
  "s03-004-schmerzen-in-der-hand.mp3": "Ich habe Schmerzen in der Hand.",
  "s03-005-schmerzen-im-ruecken.mp3": "Ich habe Schmerzen im Rücken.",
  "s03-006-schmerzen-im-bauch.mp3": "Ich habe Schmerzen im Bauch.",
  "s03-007-schmerzen-in-der-huefte.mp3": "Ich habe Schmerzen in der Hüfte.",
  "s03-008-schmerzen-im-bein.mp3": "Ich habe Schmerzen im Bein.",
  "s03-009-schmerzen-im-knie.mp3": "Ich habe Schmerzen im Knie.",
  "s03-010-schmerzen-im-fuss.mp3": "Ich habe Schmerzen im Fuß.",
  "s03-011-schmerzen-in-der-brust.mp3": "Ich habe Schmerzen in der Brust.",
  "s03-012-schmerzen-leicht.mp3": "Die Schmerzen sind leicht.",
  "s03-013-schmerzen-mittelstark.mp3": "Die Schmerzen sind mittelstark.",
  "s03-014-schmerzen-stark.mp3": "Die Schmerzen sind stark.",
  "s03-015-schmerzen-ploetzlich-staerker.mp3": "Die Schmerzen werden plötzlich stärker.",
  "s03-016-mir-ist-uebel.mp3": "Mir ist übel.",
  "s03-017-ich-fuehle-mich-schwach.mp3": "Ich fühle mich schwach.",
  "s03-018-ich-zittere.mp3": "Ich zittere.",
  "s03-019-ich-schwitze-ungewoehnlich-stark.mp3": "Ich schwitze ungewöhnlich stark.",
  "s03-020-ich-kann-schlecht-sehen.mp3": "Ich kann schlecht sehen.",
  "s03-021-ich-kann-schlecht-hoeren.mp3": "Ich kann schlecht hören.",
  "s03-022-atmen-faellt-mir-schwer.mp3": "Atmen fällt mir schwer.",
  "s03-023-schlucken-faellt-mir-schwer.mp3": "Schlucken fällt mir schwer.",
  "s03-024-mund-fuehlt-sich-trocken-an.mp3": "Mein Mund fühlt sich trocken an.",
  "s03-025-hand-fuehlt-sich-taub-an.mp3": "Meine Hand fühlt sich taub an.",
  "s03-026-bein-fuehlt-sich-schwer-an.mp3": "Mein Bein fühlt sich schwer an.",
  "s03-027-heute-weniger-kraft.mp3": "Ich habe heute weniger Kraft.",
  "s03-028-heute-anders-als-sonst.mp3": "Heute ist es anders als sonst.",
  "s03-029-veraenderung-ploetzlich-begonnen.mp3": "Die Veränderung hat plötzlich begonnen.",
  "s03-030-veraenderung-ernst-nehmen.mp3": "Bitte nehmen Sie die Veränderung ernst.",
  "s03-031-medikament-vorgesehen.mp3": "Ist dieses Medikament für mich vorgesehen?",
  "s03-032-medikament-namen-vorlesen.mp3": "Bitte lesen Sie mir den Namen des Medikaments vor.",
  "s03-033-einnahmeplan-pruefen.mp3": "Bitte prüfen Sie meinen Einnahmeplan.",
  "s03-034-medikament-jetzt-nehmen.mp3": "Soll ich dieses Medikament jetzt nehmen?",
  "s03-035-praxis-nachfragen.mp3": "Bitte fragen Sie in der Praxis nach.",
  "s03-036-frage-zur-einnahme-aufschreiben.mp3": "Bitte schreiben Sie meine Frage zur Einnahme auf.",
};

const manifestPath = "audio-import/wortnah-audio-intake-manifest.json";
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
for (const asset of manifest.assets) {
  if (phrases[asset.filename]) { asset.textDe = phrases[asset.filename]; asset.reviewed = true; }
}
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`reviewed_assets=${manifest.assets.filter((asset) => asset.reviewed).length}`);

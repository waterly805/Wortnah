import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../app/wortnah-app.tsx", import.meta.url), "utf8");
const functionSource = await readFile(new URL("../supabase/functions/send-message-email-alerts/index.ts", import.meta.url), "utf8");
const migration = await readFile(new URL("../supabase/migrations/20260911230000_reliable_priority_email_outbox.sql", import.meta.url), "utf8");

test("messages save an immutable German path before email is attempted", () => {
  const start = appSource.indexOf("const sendMessage");
  const end = appSource.indexOf("const markRead", start);
  const flow = appSource.slice(start, end);
  assert.match(flow, /navigationPathDe = \[purpose\.de, topic\.de, detail\.de\]\.join\(" › "\)/);
  assert.match(flow, /navigation_path_de: navigationPathDe/);
  assert.match(flow, /email_notification_requested: priority !== "normal"/);
  assert.ok(flow.indexOf('.from("messages").insert') < flow.indexOf('functions.invoke("send-message-email-alerts"'));
  assert.match(flow, /Mitteilung gespeichert\. Die E-Mail wird automatisch weiter versucht\./);
});

test("only important messages create durable delivery jobs", () => {
  assert.match(migration, /if new\.priority not in \('important', 'very_important'\) then[\s\S]*return new/);
  assert.match(migration, /after insert on public\.messages/);
  assert.match(migration, /recipient\.enabled[\s\S]*recipient\.consented_at is not null/);
  assert.match(migration, /new\.notify_normal := false/);
  assert.match(migration, /on conflict \(message_id, recipient_id\)[\s\S]*do nothing/);
});

test("the worker leases jobs and retries without duplicate sends", () => {
  assert.match(migration, /for update skip locked/);
  assert.match(migration, /status = 'processing'/);
  assert.match(migration, /attempt_count = delivery\.attempt_count \+ 1/);
  assert.match(migration, /array\[1, 5, 15, 60, 180, 720\]/);
  assert.match(migration, /status = 'sent'/);
  assert.match(migration, /wortnah-email-alert-worker/);
  assert.match(migration, /'\*\/2 \* \* \* \*'/);
});

test("the server-only function uses safe Option B content", () => {
  assert.match(functionSource, /Wortnah:.*wichtige.*Mitteilung/);
  assert.match(functionSource, /Bitte sehen Sie sich diese sehr wichtige Mitteilung von Werner zeitnah an\./);
  assert.match(functionSource, /Weg in Wortnah/);
  assert.match(functionSource, /Gesprächshinweis/);
  assert.match(functionSource, /ob Sie ihn richtig verstanden haben/);
  assert.match(functionSource, /https:\/\/www\.wort-nah\.com/);
  assert.match(functionSource, /GMAIL_SENDER_EMAIL/);
  assert.match(functionSource, /GMAIL_APP_PASSWORD/);
  assert.doesNotMatch(appSource, /GMAIL_APP_PASSWORD|smtp\.gmail\.com/);
});

test("provider failures become safe retry or terminal states", () => {
  assert.match(functionSource, /safeProviderError/);
  assert.match(functionSource, /provider_timeout/);
  assert.match(functionSource, /retryable/);
  assert.match(functionSource, /finish_email_notification_delivery/);
  assert.match(appSource, /E-Mail fehlgeschlagen/);
  assert.match(appSource, /E-Mail wird erneut versucht/);
  assert.match(appSource, /Keine E-Mail – normale Priorität/);
});

test("accepted SMTP deliveries are not duplicated by cleanup or finalization failures", () => {
  assert.match(functionSource, /delivery already accepted/);
  assert.match(functionSource, /for \(let finishAttempt = 1; finishAttempt <= 3; finishAttempt \+= 1\)/);
  assert.match(functionSource, /delivery status update failed/);
  assert.match(migration, /if delivery\.status = 'sent' then return 'sent'/);
});

test("retention is limited to the canonical active space", () => {
  assert.match(migration, /sent_at < now\(\) - interval '30 days'/);
  assert.match(migration, /317579c9-9b2e-42fb-8713-832edbc25556/);
  assert.match(migration, /on delete cascade/);
});

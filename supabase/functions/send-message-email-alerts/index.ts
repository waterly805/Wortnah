import { createClient } from "npm:@supabase/supabase-js@2";

const publicAppUrl = "https://www.wort-nah.com";
const allowedOrigins = new Set([
  publicAppUrl,
  "https://wortnah-kommunikation.danny-ly-1897.chatgpt.site",
  "http://localhost:3000",
  "http://localhost:5173",
]);

type Priority = "important" | "very_important";
type DeliveryJob = {
  delivery_id: string;
  message_id: string;
  space_id: string;
  recipient_email: string;
  body_de: string;
  navigation_path_de: string;
  priority: Priority;
  sent_at: string;
  attempt_count: number;
  max_attempts: number;
};

function cors(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : publicAppUrl,
    "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info, x-wortnah-worker-key",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(request: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(request), "Content-Type": "application/json" },
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character] ?? character);
}

function base64Utf8(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64MimeUtf8(value: string) {
  return base64Utf8(value).match(/.{1,76}/g)?.join("\r\n") ?? "";
}

function smtpData(value: string) {
  return value.replace(/\r?\n/g, "\r\n").replace(/(^|\r\n)\./g, "$1..");
}

function serverKey() {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
  return keys.default as string | undefined;
}

function publicKey() {
  const legacy = Deno.env.get("SUPABASE_ANON_KEY");
  if (legacy) return legacy;
  const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
  return keys.default as string | undefined;
}

function safeProviderError(error: unknown) {
  const message = error instanceof Error ? error.message : "provider_failed";
  const smtpCode = message.match(/SMTP (\d{3})/)?.[1];
  if (smtpCode) return { code: `smtp_${smtpCode}`, retryable: !["501", "535", "550", "551", "553"].includes(smtpCode) };
  if (/timed out/i.test(message)) return { code: "provider_timeout", retryable: true };
  if (/closed/i.test(message)) return { code: "provider_connection_closed", retryable: true };
  return { code: "provider_failed", retryable: true };
}

async function sendWithGmailSmtp(input: { from: string; to: string; mime: string; appPassword: string }) {
  let connection: Deno.TlsConn | null = null;
  const timeout = setTimeout(() => connection?.close(), 25_000);
  try {
    connection = await Deno.connectTls({ hostname: "smtp.gmail.com", port: 465 });
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let pending = "";

    const read = async () => {
      while (true) {
        const lines = pending.split("\r\n");
        for (let index = 0; index < lines.length - 1; index += 1) {
          const match = lines[index].match(/^(\d{3}) (.*)$/);
          if (!match) continue;
          pending = lines.slice(index + 1).join("\r\n");
          return { code: Number(match[1]), text: match[2] };
        }
        if (pending.length > 32_000) throw new Error("SMTP response too large");
        const buffer = new Uint8Array(4096);
        const bytesRead = await connection!.read(buffer);
        if (bytesRead === null) throw new Error("SMTP connection closed");
        pending += decoder.decode(buffer.subarray(0, bytesRead));
      }
    };
    const expect = async (allowed: number[]) => {
      const response = await read();
      if (!allowed.includes(response.code)) throw new Error(`SMTP ${response.code}: ${response.text}`);
    };
    const command = async (value: string, allowed: number[]) => {
      await connection!.write(encoder.encode(`${value}\r\n`));
      await expect(allowed);
    };

    await expect([220]);
    await command("EHLO wort-nah.com", [250]);
    await command("AUTH LOGIN", [334]);
    await command(base64Utf8(input.from), [334]);
    await command(base64Utf8(input.appPassword.replace(/\s/g, "")), [235]);
    await command(`MAIL FROM:<${input.from}>`, [250]);
    await command(`RCPT TO:<${input.to}>`, [250, 251]);
    await command("DATA", [354]);
    await connection.write(encoder.encode(`${smtpData(input.mime)}\r\n.\r\n`));
    await expect([250]);
    await command("QUIT", [221]);
  } finally {
    clearTimeout(timeout);
    try { connection?.close(); } catch { /* already closed by timeout */ }
  }
}

function composeEmail(job: Pick<DeliveryJob, "message_id" | "body_de" | "navigation_path_de" | "priority" | "sent_at">, senderEmail: string, recipientEmail: string) {
  const veryImportant = job.priority === "very_important";
  const priorityLabel = veryImportant ? "Sehr wichtig" : "Wichtig";
  const timestamp = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(job.sent_at));
  const opening = veryImportant
    ? "Bitte sehen Sie sich diese sehr wichtige Mitteilung von Werner zeitnah an."
    : "Werner hat eine wichtige Mitteilung in Wortnah gesendet.";
  const guidance = "Bitte lesen Sie die Mitteilung zuerst genau vor und fragen Sie Werner anschließend, ob Sie ihn richtig verstanden haben.";
  const subject = `Wortnah: ${veryImportant ? "sehr wichtige" : "wichtige"} Mitteilung`;
  const path = job.navigation_path_de || "Kommunikation";
  const text = `${opening}\n\nMitteilung:\n${job.body_de}\n\nWeg in Wortnah: ${path}\nPriorität: ${priorityLabel}\nGesendet am: ${timestamp}\n\nGesprächshinweis:\n${guidance}\n\nWortnah öffnen: ${publicAppUrl}`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#102c46;line-height:1.5"><p style="font-size:18px;font-weight:700">${escapeHtml(opening)}</p><div style="margin:20px 0;padding:18px;border-radius:12px;background:#eef6fb"><p style="margin:0 0 6px;color:#4e6478">Mitteilung</p><p style="font-size:22px;font-weight:700;margin:0">${escapeHtml(job.body_de)}</p></div><p><strong>Weg in Wortnah:</strong> ${escapeHtml(path)}</p><p><strong>Priorität:</strong> ${escapeHtml(priorityLabel)}<br><strong>Gesendet am:</strong> ${escapeHtml(timestamp)}</p><div style="margin:20px 0;padding:16px;border-left:4px solid #e6ad3c;background:#fff8e7"><strong>Gesprächshinweis</strong><br>${escapeHtml(guidance)}</div><a href="${publicAppUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#0b3b67;color:white;text-decoration:none;font-weight:700">Wortnah öffnen</a><p style="margin-top:24px;color:#6b7c8c;font-size:13px">Diese E-Mail wurde gesendet, weil die Benachrichtigung in Wortnah von einer Begleitperson freigegeben wurde.</p></div>`;
  const boundary = `wortnah_${job.message_id.replace(/-/g, "")}`;
  const mime = [
    `From: Wortnah <${senderEmail}>`,
    `To: ${recipientEmail}`,
    `Subject: =?UTF-8?B?${base64Utf8(subject)}?=`,
    `Message-ID: <${job.message_id}@wort-nah.com>`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    base64MimeUtf8(text),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    base64MimeUtf8(html),
    `--${boundary}--`,
  ].join("\r\n");
  return { subject, text, html, mime };
}

async function authenticatedUser(request: Request, anonKey: string) {
  const authorization = request.headers.get("authorization");
  if (!authorization) return null;
  const client = createClient(Deno.env.get("SUPABASE_URL")!, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = authorization.replace(/^Bearer\s+/i, "");
  const { data, error } = await client.auth.getUser(token);
  return error || !data.user ? null : { client, user: data.user };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors(request) });
  if (request.method !== "POST") return json(request, { error: "Not available" }, 405);

  const origin = request.headers.get("origin");
  if (origin && !allowedOrigins.has(origin)) return json(request, { error: "Not available" }, 403);

  const serviceKey = serverKey();
  const anonKey = publicKey();
  if (!serviceKey || !anonKey) return json(request, { error: "Service unavailable" }, 503);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const body = await request.json().catch(() => ({})) as { mode?: string; message_id?: string; recipient_id?: string; delivery_id?: string };
    const mode = body.mode ?? "message";
    const suppliedWorkerKey = request.headers.get("x-wortnah-worker-key");
    let workerKey = suppliedWorkerKey;
    let requestedMessageId: string | null = null;

    if (mode === "drain") {
      if (!workerKey) return json(request, { error: "Authentication required" }, 401);
    } else {
      const authenticated = await authenticatedUser(request, anonKey);
      if (!authenticated) return json(request, { error: "Authentication required" }, 401);

      if (mode === "retry") {
        if (typeof body.delivery_id !== "string") return json(request, { error: "Invalid delivery" }, 400);
        const { data: delivery } = await authenticated.client
          .from("email_notification_deliveries")
          .select("id,message_id")
          .eq("id", body.delivery_id)
          .single();
        if (!delivery) return json(request, { error: "Delivery not available" }, 404);
        const { data: reset, error: retryError } = await authenticated.client.rpc("retry_email_notification_delivery", {
          target_delivery_id: delivery.id,
        });
        if (retryError || !reset) return json(request, { error: "Delivery cannot be retried" }, 409);
        requestedMessageId = delivery.message_id;
        const { data: storedKey, error: keyError } = await admin.rpc("get_email_worker_key");
        if (keyError || typeof storedKey !== "string") throw new Error("worker_key_unavailable");
        workerKey = storedKey;
      } else if (mode === "test") {
        if (typeof body.recipient_id !== "string") return json(request, { error: "Invalid recipient" }, 400);
        const { data: recipient } = await authenticated.client
          .from("email_notification_recipients")
          .select("id,email,space_id")
          .eq("id", body.recipient_id)
          .eq("enabled", true)
          .single();
        if (!recipient) return json(request, { error: "Recipient not available" }, 404);
        const senderEmail = Deno.env.get("GMAIL_SENDER_EMAIL");
        const appPassword = Deno.env.get("GMAIL_APP_PASSWORD");
        if (!senderEmail || !appPassword) return json(request, { error: "Email provider is not configured" }, 503);
        const testJob = {
          message_id: crypto.randomUUID(), body_de: "Dies ist eine Test-E-Mail. Es wurde keine Mitteilung von Werner versendet.",
          navigation_path_de: "Einstellungen › E-Mail-Benachrichtigungen", priority: "important" as const,
          sent_at: new Date().toISOString(),
        };
        await sendWithGmailSmtp({ from: senderEmail, to: recipient.email, mime: composeEmail(testJob, senderEmail, recipient.email).mime, appPassword });
        return json(request, { ok: true, test: true, status: "sent" });
      } else if (typeof body.message_id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.message_id)) {
        return json(request, { error: "Invalid message" }, 400);
      } else {
        const { data: message } = await authenticated.client
          .from("messages")
          .select("id,priority,sender_profile_id")
          .eq("id", body.message_id)
          .eq("sender_profile_id", authenticated.user.id)
          .single();
        if (!message) return json(request, { error: "Message not available" }, 404);
        if (!(["important", "very_important"] as string[]).includes(message.priority)) {
          return json(request, { ok: true, status: "not_requested", sent: 0, retrying: 0, failed: 0 });
        }
        requestedMessageId = message.id;
        const { data: storedKey, error: keyError } = await admin.rpc("get_email_worker_key");
        if (keyError || typeof storedKey !== "string") throw new Error("worker_key_unavailable");
        workerKey = storedKey;
      }
    }

    const { data: jobs, error: claimError } = await admin.rpc("claim_email_notification_deliveries", {
      worker_key: workerKey,
      requested_message_id: requestedMessageId,
      batch_size: requestedMessageId ? 3 : 5,
    });
    if (claimError) return json(request, { error: "Authentication required" }, 401);

    const claimedJobs = (jobs ?? []) as DeliveryJob[];
    if (!claimedJobs.length) {
      if (requestedMessageId) {
        const { data: existing } = await admin
          .from("email_notification_deliveries")
          .select("status")
          .eq("message_id", requestedMessageId);
        const statuses = (existing ?? []).map((delivery) => delivery.status as string);
        const status = !statuses.length ? "no_recipients"
          : statuses.every((value) => value === "sent") ? "sent"
          : statuses.some((value) => value === "failed") ? "failed"
          : "retrying";
        return json(request, { ok: status !== "failed", status, processed: 0 });
      }
      return json(request, { ok: true, status: "idle", processed: 0 });
    }

    const senderEmail = Deno.env.get("GMAIL_SENDER_EMAIL");
    const appPassword = Deno.env.get("GMAIL_APP_PASSWORD");
    let sent = 0;
    let retrying = 0;
    let failed = 0;

    for (const job of claimedJobs) {
      let delivered = false;
      let errorCode: string | null = null;
      let retryable = true;
      try {
        if (!senderEmail || !appPassword) throw new Error("provider_not_configured");
        const email = composeEmail(job, senderEmail, job.recipient_email);
        await sendWithGmailSmtp({ from: senderEmail, to: job.recipient_email, mime: email.mime, appPassword });
        delivered = true;
      } catch (error) {
        const safeError = safeProviderError(error);
        errorCode = error instanceof Error && error.message === "provider_not_configured" ? "provider_not_configured" : safeError.code;
        retryable = errorCode !== "provider_not_configured" && safeError.retryable;
        console.error("email delivery failed", errorCode);
      }

      const { data: finalStatus, error: finishError } = await admin.rpc("finish_email_notification_delivery", {
        worker_key: workerKey,
        target_delivery_id: job.delivery_id,
        delivered,
        safe_error_code: errorCode,
        provider_id: null,
        retryable,
      });
      if (finishError) throw new Error("delivery_status_update_failed");
      if (finalStatus === "sent") sent += 1;
      else if (finalStatus === "retrying") retrying += 1;
      else failed += 1;
    }

    return json(request, {
      ok: failed === 0,
      status: failed ? "failed" : retrying ? "retrying" : "sent",
      processed: claimedJobs.length,
      sent,
      retrying,
      failed,
    }, failed ? 207 : 200);
  } catch (error) {
    console.error("email worker failed", error instanceof Error ? error.message : "unknown");
    return json(request, { error: "Email delivery is temporarily unavailable" }, 500);
  }
});

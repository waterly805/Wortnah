# send-message-email-alerts deployment contract

This function is the server-only delivery worker for the Wortnah priority-email outbox.

- Deploy with legacy gateway JWT verification **disabled**. The function performs its own authorization because scheduled calls use the private database-generated worker key, while browser calls use the signed-in user's JWT.
- Keep `GMAIL_SENDER_EMAIL` and `GMAIL_APP_PASSWORD` only in Supabase Edge Function secrets.
- Never copy the worker key, Gmail credentials or recipient addresses into source, logs or deployment commands.
- The database migration queues only `important` and `very_important` messages and invokes the drain mode every two minutes.
- Browser `message` mode may make an immediate attempt after the message has committed.
- Companion-only `test` mode sends a fixed privacy-safe test to an enabled recipient.
- Companion-only `retry` mode resets one terminal failure and processes it immediately.

Required deployment order:

1. Apply `20260911230000_reliable_priority_email_outbox.sql`.
2. Deploy this function with gateway JWT verification disabled.
3. Confirm the two cron jobs and the function revision.
4. Add an enabled, consented recipient through Admin settings.
5. With action-time approval, send one test email and verify both the function response and the received mailbox message.

The HTTP worker returns safe status codes only. Provider credentials and recipient-specific SMTP responses must never be returned to the browser.

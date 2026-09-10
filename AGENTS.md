# Wortnah project guidance

For any Wortnah audit, implementation, debugging, design, backend, audio, or release task, read and follow `skills/wortnah-maintainer/SKILL.md` before making changes.

Before substantial work, also read `docs/PROJECT_STATE.md` and `docs/WORKFLOW.md`. Treat `docs/PROJECT_STATE.md` as the live operational source of truth for what is implemented, verified, in progress, and safe to release. If it disagrees with the current source, migrations, live backend, or deployed Site, reconcile the disagreement before continuing.

The user's current instruction takes precedence over project guidance. Never write access codes, PINs, Supabase secrets, ElevenLabs keys, session tokens, or temporary Site credentials into source files, logs, documentation, or chat responses.

Keep durable specifications, release notes, and implementation updates in the repository documentation. Keep human-facing durable copies and release artifacts in the existing Wortnah OneDrive/SharePoint folder when useful. Work from the current application and migrations; do not rebuild from an older archive.

A change is not complete merely because code was edited. Before marking work done, verify the applicable acceptance criteria, tests, migrations/backend state, deployment state, and update `docs/PROJECT_STATE.md` plus any affected product, system, release, or acceptance documentation.

---
name: wortnah-maintainer
description: Maintain, debug, test, and release the Wortnah communication app. Use for Wortnah changes involving patient or companion flows, accessible UI, Supabase data and authentication, private audio, documentation, or Sites publishing.
---

# Wortnah Maintainer

Improve the existing application in small, reviewable batches. Preserve the current product contract and diagnose failures at their actual boundary before changing architecture.

## Start with current state

1. Read `references/product-contract.md` for every product or UI change.
2. Read `references/system-and-release.md` for Supabase, audio, deployment, recovery, or production debugging.
3. Inspect the current source and the latest files in `docs/`. Treat archives as recovery copies rather than the source of truth.

## Working method

- Reproduce the reported behavior and identify whether the failure is in the browser, Site deployment, Supabase schema/RLS, an Edge Function, private storage, or a third-party service.
- Keep patient interactions calm, large, predictable, and German-first. Apply Refero research before material visual changes and record the chosen reference direction.
- Preserve the existing data model and write an idempotent migration for schema changes. Review current Supabase guidance and relevant RLS policies before production schema or policy work.
- For audio, preserve the approved-MP3, generated-cache, device-voice order. Never expose server secrets or generate audio that already exists.
- Add or update a focused behavior test when a change fixes authentication, privacy, choice limits, audio selection, or a previously observed regression.
- Run the production build and focused checks before packaging. Broaden testing only when the changed area requires it.
- Update the implementation log and release notes after verified work. Copy durable documentation and release artifacts to the existing OneDrive Wortnah folder.

## Release discipline

Push the exact verified source before saving a Site version. Package only successful build output with the official Sites helper, then save, deploy, and inspect the returned deployment status. Never call a Site live until the service reports success.

Confirm the current Site audience separately from the app's three-profile login. Public Site access and Wortnah profile access are different layers.

The user's instructions override this skill. Existing authorization in the conversation remains valid; ask only when an external action truly requires new user input or an enforced approval gate blocks it.

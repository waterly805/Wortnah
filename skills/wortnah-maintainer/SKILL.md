---
name: wortnah-maintainer
description: Maintain, debug, test, and release the Wortnah communication app. Use for Wortnah changes involving patient or companion flows, accessible UI, Supabase data and authentication, private audio, documentation, or Sites publishing.
---

# Wortnah Maintainer

Improve the existing application in small, reviewable batches. Preserve the current product contract and diagnose failures at their actual boundary before changing architecture.

## Start with current state

1. Read `docs/PROJECT_STATE.md` and `docs/WORKFLOW.md` for every substantial Wortnah task.
2. Read `references/product-contract.md` for every product or UI change.
3. Read `references/system-and-release.md` for Supabase, audio, deployment, recovery, or production debugging.
4. Inspect the current source, tests, migrations and the latest relevant files in `docs/`. Treat dated archives as recovery/history rather than the source of truth.
5. If `PROJECT_STATE.md`, source, migrations, live backend, or deployed Site disagree, reconcile the discrepancy before adding new work.

## Working method

- Freeze the requested feature or fix into observable acceptance criteria in `docs/PROJECT_STATE.md` before implementation when the work changes behavior.
- Reproduce the reported behavior and identify whether the failure is in the browser, Site deployment, Supabase schema/RLS, an Edge Function, private storage, or a third-party service.
- Keep patient interactions calm, large, predictable, and German-first. Apply Refero research before material visual changes and record the chosen reference direction.
- Preserve the existing data model and write an idempotent migration for schema changes. Review current Supabase guidance and relevant RLS policies before production schema or policy work.
- For audio, preserve the approved-MP3, generated-cache, device-voice order. Never expose server secrets or generate audio that already exists.
- Add or update a focused behavior test when a change fixes authentication, privacy, choice limits, audio selection, or a previously observed regression.
- Run the production build and focused checks before packaging. Broaden testing only when the changed area requires it.
- Update `docs/PROJECT_STATE.md`, the implementation log, release notes, acceptance checklist, and product/system references as applicable after verified work. Documentation must describe the resulting reality, not the intended change.
- Copy durable human-facing documentation and release artifacts to the existing OneDrive/SharePoint Wortnah folder when useful, but keep GitHub as the canonical technical source of truth.

## Definition of done

A change is not complete until every applicable acceptance criterion has been verified and the code, database/backend, tests, documentation and deployed state agree. Do not mark a feature complete based only on an implementation message or a successful upload.

## Release discipline

Push the exact verified source before saving a Site version. Package only successful build output with the official Sites helper, then save, deploy, and inspect the returned deployment status. Never call a Site live until the service reports success.

Confirm the current Site audience separately from the app's three-profile login. Public Site access and Wortnah profile access are different layers.

After a successful deployment, run the matching live acceptance checklist and update `docs/PROJECT_STATE.md` with the deployed revision and verification result.

The user's instructions override this skill. Existing authorization in the conversation remains valid; ask only when an external action truly requires new user input or an enforced approval gate blocks it.

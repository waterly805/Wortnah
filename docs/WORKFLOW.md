# Wortnah Working Workflow

This workflow exists to reduce repeated work, stale documentation and unnecessary Work-credit usage.

## Core rule

**Discuss in chat. Record the agreed requirement in GitHub. Implement from GitHub. Verify against reality. Update GitHub before closing the task.**

Do not use an old chat summary as the implementation source of truth.

## Where information belongs

### GitHub — canonical project source

Store here:

- Current source code.
- Tests.
- Database migrations.
- `docs/PROJECT_STATE.md`.
- Product and architecture contracts.
- Feature acceptance criteria.
- Release checklists and release notes.
- Durable implementation decisions that affect future development.

### Local computer — working copy only

Use the local repository clone for editing, building and testing. Do not keep a separate authoritative specification or release history only on the local computer.

If a local change matters, commit/push it so GitHub becomes the durable record.

### OneDrive / SharePoint — archive and human-facing project documents

Use it for:

- Exported reports.
- Screenshots and supporting evidence.
- Larger project documents intended for sharing or reading outside the codebase.
- Release artifacts and durable copies when useful.

Do not make OneDrive/SharePoint a second competing current-state tracker for implementation. The current technical state belongs in GitHub.

## Before starting a feature

1. Read `docs/PROJECT_STATE.md`.
2. Read the relevant product/system reference.
3. Inspect the current source and latest migration/database state for the area being changed.
4. Check whether the requested behavior already exists partly or fully.
5. Write the feature below under **Current work** in `docs/PROJECT_STATE.md`.
6. Freeze acceptance criteria before implementation.

Use this format:

```md
### FEATURE-XXX — Short feature name

Status: Planned | In progress | Blocked | Verified

Goal:
One sentence describing the user outcome.

Acceptance criteria:
- [ ] Observable behavior 1
- [ ] Observable behavior 2
- [ ] Observable behavior 3

Affected areas:
- Frontend:
- Backend/Supabase:
- Database/migrations:
- Audio:
- Deployment:

Verification required:
- [ ] Focused automated check
- [ ] Related regression check
- [ ] Live check if deployed

Notes / decisions:
- ...
```

## During implementation

- Work in the smallest reviewable batch that completes one coherent goal.
- Do not redesign unrelated architecture while fixing a local problem.
- When database schema or policies change, save an idempotent migration and verify the live state after deployment.
- When authentication, privacy, choice limits, audio selection or a previously observed regression changes, add/update focused behavior tests.
- Use current external documentation only when the task depends on an API/library/service behavior that may have changed.
- Prefer inspecting the actual current Wortnah implementation over broad research that does not affect the task.

## Before marking a feature complete

Verify every applicable acceptance criterion against the implementation.

Then update, in the same work session:

1. `docs/PROJECT_STATE.md` — actual current state.
2. Product contract — if user/product behavior changed.
3. System/release reference — if infrastructure, database, deployment or service behavior changed.
4. Release notes / implementation log — if appropriate for the release.
5. Acceptance checklist — if the release needs new live checks.

A code change without these updates is incomplete.

## Release workflow

1. Confirm `docs/PROJECT_STATE.md` has no unresolved discrepancy relevant to the release.
2. Build the exact intended source revision.
3. Run focused automated checks.
4. Push the exact verified source to GitHub.
5. Compare required Supabase migrations/functions with live state when applicable.
6. Package/deploy the exact verified source.
7. Wait for a terminal deployment success/failure result; do not infer success from upload/save alone.
8. Run the matching `LIVE-ACCEPTANCE-CHECKLIST` against the live Site.
9. Update `docs/PROJECT_STATE.md` with the deployed revision and verification result.
10. Update release notes and implementation log.
11. Copy human-facing durable artifacts to the existing Wortnah OneDrive/SharePoint location when useful.

## Work-credit saving strategy

Use normal Chat primarily for:

- Product discussion.
- Requirement clarification.
- Architecture choices.
- Acceptance criteria.
- Reviewing a bounded change.

Use Work for bounded execution such as:

- Inspecting the repository/current runtime.
- Implementing one or a small group of related features.
- Running builds/tests.
- Updating Supabase where authorized and required.
- Deploying and verifying a release.

A good Work instruction should point to `docs/PROJECT_STATE.md` and the specific feature ID instead of asking Work to rediscover requirements from old conversations.

Example:

```text
Implement FEATURE-014 from docs/PROJECT_STATE.md.
Read AGENTS.md and the Wortnah maintainer guidance first.
Inspect the current implementation before changing anything.
Complete every acceptance criterion, run the required checks, and update PROJECT_STATE.md plus any affected product/system/release documentation.
Do not mark the feature complete unless the code, database, tests, documentation and deployed state agree.
```

## Drift rule

If any of these disagree:

- Chat summary
- `PROJECT_STATE.md`
- Product/system references
- Source code
- Database migrations/live schema
- Deployed Site

**Do not continue by guessing.** Determine which state is actually current, reconcile the records, then continue development.

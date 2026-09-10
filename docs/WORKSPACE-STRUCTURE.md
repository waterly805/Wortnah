# Wortnah Workspace Structure

This document defines where Wortnah files belong and which copy may be edited.

## The three locations

### 1. Local working copy

Path: `/Users/DL/Documents/ChatGPT/Wortnah`

Use this folder for all implementation, testing and release work. It is a normal Git working copy connected to `waterly805/Wortnah`.

### 2. GitHub

Repository: `waterly805/Wortnah`

GitHub `main` is the canonical technical source of truth. It contains the source code, tests, migrations, current project state, workflow guidance and release records. A change is durable only after it is committed and pushed.

### 3. OneDrive

Folder: `ChatGPT Work Personal/Wortnah`

OneDrive is the human-readable documentation and recovery archive. It contains current reference copies, dated release archives and historical material. Do not edit application source or maintain a second current codebase there.

Supabase remains the source of truth for live application data. Secrets and login values belong in their approved service or local ignored environment only; never place them in GitHub, OneDrive, documentation or chat.

## Normal start of work

```bash
cd /Users/DL/Documents/ChatGPT/Wortnah
git status
git remote -v
git fetch origin
git pull --ff-only origin main
```

If `git status` reports local changes, review and preserve them before pulling. Do not copy an older OneDrive source archive over the working folder.

## Normal end of work

1. Build and run the checks required by `docs/WORKFLOW.md`.
2. Review the changed files and confirm no secret or login value is included.
3. Commit and push the verified change to GitHub `main`.
4. Update `docs/PROJECT_STATE.md` and the applicable release records.
5. Refresh the selected OneDrive documentation copies and add a dated source archive only for a release or recovery milestone.

## OneDrive layout

- `Current Documentation/` — reference copies of current project and release records.
- `Release Archives/Current/` — the latest verified source archive and checksum.
- `Release Archives/Previous/` — older source and Site packages kept for recovery.
- `Historical Reference/` — superseded specifications, scripts, migrations and implementation notes.
- `Codex-Skills/` — a readable backup of the Wortnah maintainer guidance.

When a current reference conflicts with GitHub, GitHub wins and the OneDrive copy should be refreshed from it.

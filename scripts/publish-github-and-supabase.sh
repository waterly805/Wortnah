#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
project_ref="dffmqcqidqkbqeorjtlb"
github_repo="https://github.com/waterly805/Wortnah.git"
release_dir="$(mktemp -d "${TMPDIR:-/tmp}/wortnah-release.XXXXXX")"
trap 'rm -rf "${release_dir}"' EXIT

for command_name in git node rsync; do
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    echo "Missing required command: ${command_name}" >&2
    exit 1
  fi
done

if command -v supabase >/dev/null 2>&1; then
  supabase_cli=(supabase)
elif command -v npx >/dev/null 2>&1; then
  echo "Supabase CLI is not installed globally; using the official npx package."
  supabase_cli=(npx --yes supabase@latest)
else
  echo "Missing required command: supabase (or npx as a fallback)" >&2
  exit 1
fi

echo "Preparing the verified source on top of the current GitHub main branch..."
git clone "${github_repo}" "${release_dir}"
rsync -a \
  --exclude '.git/' \
  --exclude 'node_modules/' \
  --exclude 'dist/' \
  --exclude '.sites-runtime/' \
  --exclude '.wrangler/' \
  --exclude '.pnpm-store/' \
  --exclude 'scripts/publish-github-and-supabase.sh' \
  --exclude 'audio-import/ElevenLabs-Audio/' \
  "${project_root}/" "${release_dir}/"
rm -rf "${release_dir}/supabase/functions/wortnah-natural-voice"

cd "${release_dir}"

git add -A
git diff --cached --check
if ! git diff --cached --quiet; then
  git commit -m "Complete Wortnah 0.5.0 guided search audio and login"
  git push origin main
else
  echo "GitHub already contains the current source."
fi

if [[ ! -f supabase/config.toml ]]; then
  "${supabase_cli[@]}" init
fi

echo "Checking Supabase access and required ElevenLabs secret..."
if ! "${supabase_cli[@]}" projects list >/dev/null 2>&1; then
  echo "Supabase sign-in is required. Your browser will open for the official login."
  "${supabase_cli[@]}" login
fi
"${supabase_cli[@]}" link --project-ref "${project_ref}"
if ! "${supabase_cli[@]}" secrets list --project-ref "${project_ref}" | grep -q 'ELEVENLABS_API_KEY'; then
  echo "ELEVENLABS_API_KEY is not configured in Supabase. Add it before publishing." >&2
  exit 1
fi

echo "Reviewing and applying the pending database migration..."
deployment_migrations="$(mktemp -d "${TMPDIR:-/tmp}/wortnah-migrations.XXXXXX")"
for applied_version in \
  20260903111026 20260903111150 20260903111321 20260903112722 \
  20260903172629 20260903182716 20260903183232 20260903192759 \
  20260903193255 20260904060827 20260904071820 20260904072649 \
  20260904112231 20260904113940 20260904124455 20260904130600 \
  20260904203237 20260904211453 20260905132429 20260905150216 \
  20260905150229 20260905153055 20260905202135; do
  : > "${deployment_migrations}/${applied_version}_remote_history.sql"
done
cp "${project_root}/supabase/migrations/20260906150000_allow_twelve_patient_choices.sql" "${deployment_migrations}/"
cp "${project_root}/supabase/migrations/20260907211000_align_pilot_profile_labels.sql" "${deployment_migrations}/"
cp "${project_root}/supabase/migrations/20260909120000_internet_search_hierarchy.sql" "${deployment_migrations}/"
mv supabase/migrations supabase/migrations.source
mv "${deployment_migrations}" supabase/migrations
"${supabase_cli[@]}" migration list
"${supabase_cli[@]}" db push --dry-run
"${supabase_cli[@]}" db push

echo "Deploying the verified login and private audio functions..."
"${supabase_cli[@]}" functions deploy pilot-login --project-ref "${project_ref}" --no-verify-jwt
"${supabase_cli[@]}" functions deploy wortnah-audio --project-ref "${project_ref}"
"${supabase_cli[@]}" functions deploy wortnah-audio-import --project-ref "${project_ref}"

echo "GitHub and the Wortnah 0.5.0 Supabase migration completed successfully."

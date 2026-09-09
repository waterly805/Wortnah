#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
project_ref="dffmqcqidqkbqeorjtlb"
release_dir="$(mktemp -d "${TMPDIR:-/tmp}/wortnah-supabase.XXXXXX")"
trap 'rm -rf "${release_dir}"' EXIT

command -v node >/dev/null 2>&1 || {
  echo "Missing required command: node" >&2
  exit 1
}

if command -v supabase >/dev/null 2>&1; then
  supabase_cli=(supabase)
elif command -v npx >/dev/null 2>&1; then
  supabase_cli=(npx --yes supabase@latest)
else
  echo "Missing required command: supabase (or npx as a fallback)" >&2
  exit 1
fi

if ! "${supabase_cli[@]}" projects list >/dev/null 2>&1; then
  echo "Supabase sign-in is required. Your browser will open for the official login."
  "${supabase_cli[@]}" login
fi

cd "${release_dir}"
"${supabase_cli[@]}" init
"${supabase_cli[@]}" link --project-ref "${project_ref}"

if ! "${supabase_cli[@]}" secrets list --project-ref "${project_ref}" | grep -q 'ELEVENLABS_API_KEY'; then
  echo "ELEVENLABS_API_KEY is not configured in Supabase." >&2
  exit 1
fi

mkdir -p supabase/functions supabase/migrations
cp -R "${project_root}/supabase/functions/pilot-login" supabase/functions/
cp -R "${project_root}/supabase/functions/wortnah-audio" supabase/functions/
cp -R "${project_root}/supabase/functions/wortnah-audio-import" supabase/functions/

for applied_version in \
  20260903111026 20260903111150 20260903111321 20260903112722 \
  20260903172629 20260903182716 20260903183232 20260903192759 \
  20260903193255 20260904060827 20260904071820 20260904072649 \
  20260904112231 20260904113940 20260904124455 20260904130600 \
  20260904203237 20260904211453 20260905132429 20260905150216 \
  20260905150229 20260905153055 20260905202135; do
  : > "supabase/migrations/${applied_version}_remote_history.sql"
done

cp "${project_root}/supabase/migrations/20260906150000_allow_twelve_patient_choices.sql" supabase/migrations/
cp "${project_root}/supabase/migrations/20260907211000_align_pilot_profile_labels.sql" supabase/migrations/
cp "${project_root}/supabase/migrations/20260909120000_internet_search_hierarchy.sql" supabase/migrations/

echo "Reviewing the pending Wortnah migrations..."
"${supabase_cli[@]}" migration list
"${supabase_cli[@]}" db push --dry-run
"${supabase_cli[@]}" db push

echo "Deploying the verified login and private audio functions..."
"${supabase_cli[@]}" functions deploy pilot-login --project-ref "${project_ref}" --no-verify-jwt
"${supabase_cli[@]}" functions deploy wortnah-audio --project-ref "${project_ref}"
"${supabase_cli[@]}" functions deploy wortnah-audio-import --project-ref "${project_ref}"

node "${project_root}/scripts/import-wortnah-audio.mjs" --validate-only
if [[ -z "${WORTNAH_ADMIN_ACCESS_CODE:-}" ]]; then
  read -r -s -p "Enter the four-digit Admin 1 access code to import the approved MP3 pack: " WORTNAH_ADMIN_ACCESS_CODE
  echo
fi
export WORTNAH_ADMIN_ACCESS_CODE
cd "${project_root}"
node scripts/import-wortnah-audio.mjs
unset WORTNAH_ADMIN_ACCESS_CODE

echo "Wortnah Supabase release completed successfully."

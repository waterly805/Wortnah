#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

while true; do
  read -r -p "Enter Admin 1's four-digit access code (digits will be visible), then press Return: " entered_code
  entered_code="$(printf '%s' "${entered_code}" | tr -cd '0-9')"
  if [[ "${#entered_code}" -eq 4 ]]; then
    break
  fi
  echo "No valid four-digit code was received. Please try again."
done

export WORTNAH_ADMIN_ACCESS_CODE="${entered_code}"
cd "${project_root}"
node scripts/import-wortnah-audio.mjs
unset WORTNAH_ADMIN_ACCESS_CODE entered_code

echo "Wortnah MP3 import completed successfully."

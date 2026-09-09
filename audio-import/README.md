# ElevenLabs audio intake

Place the complete `ElevenLabs-Audio` folder here before import.

Keep the generated MP3 filenames exactly as specified in the audio-pack lists. Do not rename them after generation.

Files are kept outside the application bundle until they have been checked for duplicates, duration, audio quality, and their final private storage mapping.

After the reviewed `wortnah-audio-import` function is deployed, run `scripts/import-wortnah-audio.mjs` with the Admin 1 access code in the temporary `WORTNAH_ADMIN_ACCESS_CODE` environment variable. The release helper prompts for this value without displaying it and imports four files at a time. Repeating the import is safe because every approved phrase uses the same private storage path.

## Import manifest

Run the intake-manifest script after copying clips into this folder. It records every filename, section, byte size, and SHA-256 checksum. The exact German phrase remains empty until it is reviewed against the approved phrase list; an asset cannot be imported while that field is empty.

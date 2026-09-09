# Wortnah audio architecture reset

Date: 6 September 2026

## Decision

Build one coherent audio system for the new Wortnah architecture. The current functions are retained as historical reference while the new system is prepared. They are not a foundation for new patient audio behavior.

## Findings from the existing functions

| Function | Current state | Decision |
| --- | --- | --- |
| `wortnah-natural-voice` | Live patient voice endpoint. Its current provider path did not return playable audio during testing. | Replace its implementation only after the new audio contract is reviewed. |
| `generate-wortnah-audio-pack` | Bulk generator. It reads the retired `ELEVENLABS_API_KEY2` name and writes a cache format that the live voice endpoint does not read. | Do not use for the new build. Use only as a reference for companion authorization and controlled batching. |
| `wortnah-audio-runner` | Deliberately disabled. | Retire from the new design. |

## New audio contract

One authenticated server-side audio endpoint will serve both patient playback and companion import work.

1. The patient selects a phrase.
2. The server checks the signed-in user’s Wortnah-space membership.
3. **First choice — approved MP3:** the server looks for the supplied, approved prerecorded MP3 for that phrase and space. This is the normal path and uses no ElevenLabs credits.
4. **Second choice — ElevenLabs cache:** only when no approved clip exists, the server may generate audio using `ELEVENLABS_API_KEY`. The key never reaches the browser. The generated result is cached privately so it is charged once and reused.
5. **Third choice — device voice:** if the server cannot provide audio, Wortnah uses the most natural available standard German voice on the patient’s device. It follows the patient’s speed setting and gives no technical error.
6. Generated audio is saved in the same private bucket and asset registry as prerecorded audio.
7. Companions can import validated MP3 files only for their own space. Patients can listen but cannot upload, replace, or enumerate files.

## Storage and cache rules

- Use the existing private `wortnah-voice-audio` bucket; it already restricts objects to `audio/mpeg` and has a 10 MB limit.
- Use one canonical phrase fingerprint and storage path for both imported and generated clips.
- Store the exact phrase, source (`manual` or `elevenlabs`), voice identifier, model, checksum, and created time in one server-only asset registry.
- Do not use separate `voice_audio_assets` and `voice_audio_cache` formats in the new implementation.
- Do not make audio public or expose Supabase service keys or ElevenLabs keys.

## Migration approach

1. Verify the final phrase map for the 180 supplied clips.
2. Build and test the new endpoint and companion-only import route against the approved schema plan.
3. Import one non-sensitive test clip into private Storage and verify patient playback plus access denial for an unrelated account.
4. Import the remaining clips only after that test passes.
5. Point the patient app to the new endpoint, test preview then confirm, and retire old endpoint references after successful verification.

No existing audio object, function, database record, or live app behavior has been deleted or changed by this decision.

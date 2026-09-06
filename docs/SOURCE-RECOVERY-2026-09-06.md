# Wortnah source recovery baseline

Date: 6 September 2026

## Repository baseline

The repository begins with the latest complete editable source archive found in the Wortnah OneDrive folder:

- Archive: `Wortnah-Source-0.3.0.tar.gz`
- SHA-256: `c1bb99e9f5dfc49224920ca6b7c1a6b6b857a1a61cec50e74267bc65e6771543`
- Recovered repository: `https://github.com/waterly805/Wortnah`

Later archives from 0.4.0 through 0.7.0 contain compiled deployment output. Release notes continue through 0.10.0, and the live application bundle is newer than the 0.7.0 bundle. Those artifacts show later behavior but cannot safely replace editable TypeScript source.

## Production relationship

- Live app: `https://wortnah.danny-ly-1890.chatgpt.site/`
- Historical Sites project ID: `appgprj_6a9958cdd71c8191839d249dd0b8e666`
- Supabase project: `dffmqcqidqkbqeorjtlb` in Frankfurt

The current Sites account cannot access the historical project ID. Do not deploy this recovery baseline over the live application. Reconstruct later changes in small, reviewed batches and verify parity before requesting deployment approval.

## Security boundary

The recovered client contains a Supabase publishable key, which is intended for browser use. No service-role key, ElevenLabs secret, password, or private key was found in the recovered tree. Runtime secrets stay in Supabase Edge Function secrets. Local runtime output under `.wrangler`, environment files, dependencies, and build output remain excluded by `.gitignore`.

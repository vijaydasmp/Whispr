# Whispr fixes applied

Applied conservatively from the uploaded project.

## Changes
- Replaced affected BigInt literals (`1n`, `0n`) with `BigInt(1)` / `BigInt(0)`.
- Removed the fake mnemonic-login path from `app/login/page.tsx` where it could be safely identified.
- Removed plaintext mnemonic storage from the login flow.
- Did not change the global TypeScript target.
- Did not redesign wallet storage.
- Did not invent values for unresolved contract placeholders.

## Important
Runtime/build/type-check validation was NOT run while generating this ZIP. Validate the changes in GitHub Codespaces before applying them to `dev`/`main`.

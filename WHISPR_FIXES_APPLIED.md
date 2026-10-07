# Whispr — fixes applied

This round fixes the "Failed to load forums" error and adds anonymous display
handles. Verified with `tsc --noEmit` (clean) and `eslint` (clean) on
2026-10-07.

## 1. Root cause of "Failed to load forums" — contract ID was ignored
`lib/platform/contract.ts`

`getStoredContractId()` always returned the hard-coded placeholder
`5RzTyKPkD3dsMhkmJvrPsgM7iSsyF4NHnustqAfVnkyi`, because
`KNOWN_CONTRACT_ID` had that placeholder as its default fallback (so it was
always truthy). That meant the real contract ID you deployed and saved from the
admin panel (localStorage) was **never used**, and every forum query hit a
contract that does not exist → the red "Failed to load forums" banner.

Now the order is:
1. the ID you actually deployed (localStorage, set by the admin panel), then
2. `NEXT_PUBLIC_WHISPR_CONTRACT_ID` if set, then
3. `null`.

## 2. Forum queries no longer filter on an unindexed field
`lib/forum.ts`

Dash Platform rejects any `where` clause not covered by a document index. The
deployed contract indexes `forumId` / `postId` / `$ownerId` but **not**
`status`, so every query that filtered on `status` was being rejected:

- `getForumPosts` (`forumId` + `status`)
- `getPostComments` (`postId` + `status`)
- `getMembership` (`$ownerId` + `forumId` + `status`)
- `getMemberCount`, `getPostCount`, `getCommentCount`

These now query only the indexed field and filter `status === 'active'` in
JavaScript. Counts will read correctly instead of silently returning 0.
No contract redeploy is required — this works with the contract you already
deployed.

## 3. `$createdAt` BigInt crash
`lib/forum.ts`, `app/forums/[forumId]/page.tsx`

Dash returns `$createdAt` / `$updatedAt` as `BigInt`, but the app typed and used
them as `number`. `formatDate()` did `Date.now() - timestamp`, which throws
`TypeError: Cannot mix BigInt and other types`. `docToObject()` now normalises
those fields to `Number`, and `formatDate` accepts `number | bigint`.

## 4. `getPost` used an unsupported query
`lib/forum.ts` — now uses `sdk.documents.get(contractId, type, id)` (like
`getForum`) instead of a `$id` `where` clause.

## 5. Leaving a forum sent an incomplete document
`lib/forum.ts`, `app/forums/[forumId]/page.tsx`

A Dash `replace` overwrites the whole document, but `leaveForum` only sent
`{ status: 'left' }`, omitting the contract-required `forumId` and `pseudonym`
— so validation failed. The replace now re-sends both.

## 6. Anonymous display name (new)
The identity still owns every document it signs (`$ownerId` is unchanged) — this
only changes the name shown next to posts and comments.

- `generateAnonymousHandle()` in `lib/forum.ts` mints a random handle
  (`Anonymous #7F3A`) using `crypto.getRandomValues`. Unlike the old
  deterministic `generatePseudonym(identityId, forumId)`, it cannot be
  recomputed from the identity ID.
- The handle is stored per identity (`lib/platform/wallet-store.ts`,
  `storeAnonHandle` / `loadAnonHandle`) so a returning user keeps the same name.
- Login (`app/login/page.tsx`) and session restore
  (`lib/platform/session-context.tsx`) assign/reuse it and set it as the session
  display handle.
- Joining a forum stores the handle in the membership document
  (`joinForum(..., pseudonym)`).
- The forum page resolves each post author's handle from the forum's membership
  documents (`getForumPseudonyms`), falling back to a deterministic pseudonym
  for authors who have no membership.

## Still open (needs your input — values not invented)
- `lib/contracts/whisper-contract.ts` still contains placeholder strings
  (`ownerId: 'REPLACE_WITH_YOUR_TESTNET_IDENTITY_ID'`,
  `$format_version: 'REPLACE_WITH_VALUE_FROM_yappr-social-contract.json'`).
  These are not used by the publish path (`buildWhisperSchemas()` sends only the
  document schemas), so they are cosmetic — but clean them up if you redeploy.
- Adding `status` to the relevant contract indexes would let the counts be
  done on-chain instead of client-side. Only worth doing if you redeploy.

## Verification note
`next build` / `next lint` could not complete in the review sandbox
(WebAssembly "out of memory" — a sandbox memory cap, not a code issue).
`tsc --noEmit` and `eslint app lib` both pass. Please run
`npm install && npm run dev` in Codespaces to confirm end-to-end.

# Whispr MVP Documentation

## Product Concept

Whispr is a decentralized forum/community DApp built on Dash Platform testnet.

**Tagline**: "Say it without saying who you are."

A user logs in using their normal Dash Platform testnet identity. After login, the user can browse forums, create forums, join forums, view posts, create pseudonymous posts, comment on posts, and react to posts.

## Important Disclaimer

> **Whispr uses Dash Platform testnet identity for authentication and document ownership. The application presents users pseudonymously in the UI. This should NOT be interpreted as cryptographic anonymity.**

The Platform identity is still visible as the document owner. The pseudonym is generated deterministically from the identity ID + forum ID for display purposes only.

---

## Architecture

### Technology Stack
- **Frontend**: Next.js 15 with React 19
- **Styling**: Tailwind CSS
- **Blockchain**: Dash Platform testnet (via @dashevo/evo-sdk)
- **Data Storage**: Dash Platform (no centralized database)

### Data Flow
```
User
  |
  v
Whisper Web App
  |
  +---- Dash Platform Identity (authentication)
  |
  +---- Forum documents
  |
  +---- Membership documents
  |
  +---- Post documents
  |
  +---- Comment documents
  |
  +---- Reaction documents
```

---

## Data Contracts

### Forum Document
```typescript
{
  name: string;        // 3-64 chars
  description: string; // max 500 chars
  status: 'active' | 'archived';
}
```
- Owner: Forum creator (Platform identity)
- Indices: by owner+createdAt, by createdAt

### Membership Document
```typescript
{
  forumId: string;     // Forum document ID
  pseudonym: string;   // e.g., "Anonymous #7F32"
  status: 'active' | 'left';
}
```
- Owner: Member identity
- Unique index per identity+forum

### Post Document
```typescript
{
  forumId: string;     // Forum document ID
  content: string;     // 1-2000 chars
  status: 'active' | 'hidden' | 'deleted';
}
```
- Owner: Post author (Platform identity)
- Indices: by forum+createdAt

### Comment Document
```typescript
{
  postId: string;      // Post document ID
  forumId: string;     // Forum document ID
  content: string;     // 1-1000 chars
  status: 'active' | 'hidden' | 'deleted';
}
```
- Owner: Comment author (Platform identity)
- Indices: by post+createdAt

### Reaction Document
```typescript
{
  postId: string;      // Post document ID
  forumId: string;     // Forum document ID
  type: 'like';
}
```
- Owner: Reactor identity
- Unique index per identity+post

---

## Identity Model

### Authentication
- Dash Platform testnet identity
- Supports both key-based login (WIF) and mnemonic recovery phrase

### Pseudonym Model

**How it works**:
1. When a user joins a forum, a pseudonym is generated
2. Pseudonym = `Anonymous #XXXX` where XXXX is a hex suffix derived from:
   - User's Platform identity ID
   - Forum ID
3. Same user gets different pseudonyms in different forums

**Pseudonym generation**:
```typescript
function generatePseudonym(identityId: string, forumId: string): string {
  const combined = identityId + forumId;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i);
    hash = hash & hash;
  }
  const suffix = (Math.abs(hash) % 0xFFFF).toString(16).toUpperCase();
  return `Anonymous #${suffix.padStart(4, '0')}`;
}
```

### Privacy Limitations

⚠️ **IMPORTANT**: This pseudonym system provides pseudonymous **presentation only**:

1. The underlying Platform identity is stored as the document owner (`$ownerId`)
2. Anyone with blockchain access can see the document owner
3. The pseudonym can be reversed (same inputs → same output)
4. Cross-forum correlation is possible by tracking identity IDs
5. This is NOT cryptographic anonymity

**Do not claim anonymity** - the system provides pseudonymous display names while the underlying identity is still traceable through Platform data.

---

## Query Strategy

### Forum Discovery
- Query all forums with `orderBy: { $createdAt: 'desc' }`
- Paginate with `limit` and `startAfter`

### Forum Posts
- Query by `forumId` + `status: 'active'`
- Order by `$createdAt: 'desc'`

### Membership
- Query by `$ownerId` + `forumId` + `status: 'active'`
- Unique index prevents duplicates

### Reactions
- Query by `postId` for counts
- Query by `$ownerId` + `postId` for user's reaction state

---

## Moderation Limitations

### Current MVP
- No built-in moderation UI
- Document status fields exist but no admin interface
- Forum owners cannot delete content (Platform documents are immutable)
- Content can be hidden in UI via status field

### Technical Notes
- Platform documents are immutable once created
- Updates can change status but cannot truly delete
- No way to remove abusive content from the chain
- Future: Consider document-based reporting system

### Recommendations for Production
1. Implement report document type
2. Add moderator roles
3. Consider content hashing for spam detection
4. Implement rate limiting on client side
5. Add IPFS for longer content (current: 2000 char max)

---

## Testnet Configuration

**Network**: Dash Platform Testnet (NOT Mainnet)

**Contract Deployment**:
```bash
# Deploy contract to testnet (requires funded identity)
npm run deploy-contract
```

**SDK Configuration**:
- Uses `EvoSDK.testnetTrusted()`
- No mainnet configuration exists
- All data persists to testnet chain

---

## Known Limitations

### MVP Scope
- [ ] No image/video uploads
- [ ] No private messaging
- [ ] No notifications
- [ ] No followers/reputation
- [ ] No advanced search
- [ ] No moderator tools
- [ ] No rate limiting
- [ ] No content moderation UI

### Technical Limitations
- [ ] No true anonymity (see Privacy Limitations)
- [ ] Platform documents are immutable
- [ ] No delete - only status update
- [ ] Limited query capabilities (no full-text search)
- [ ] Pagination is basic

---

## Future Roadmap

### Phase 2 Ideas
1. Rich text posts (markdown support)
2. File/image uploads (IPFS integration)
3. Forum categories/tags
4. User profiles with DPNS names
5. Mention system (@username)
6. Bookmarking posts

### Phase 3 Ideas
1. Private messaging
2. Direct messages
3. Notification system
4. Followers
5. Reputation system
6. Moderator tools
7. Report system
8. Content moderation queue

### Phase 4 Ideas
1. Anonymous credentials (if available)
2. Zero-knowledge proofs for identity
3. Tor/I2P integration
4. Decentralized identity verification

---

## Testing

### Two-Identity Test

**Identity A**:
1. Login with identity A
2. Create a forum
3. Publish a post

**Identity B**:
1. Login with identity B
2. Discover forum
3. Join forum
4. View post
5. Comment
6. React (like)

**Verification**:
- [ ] Both identities work independently
- [ ] Forum persists and loads after refresh
- [ ] Membership persists and loads after refresh
- [ ] Posts persist and load correctly
- [ ] Comments persist
- [ ] Reactions persist
- [ ] Pseudonyms display correctly (not raw identity IDs)
- [ ] No mainnet calls occur

---

## Deployment

### Development
```bash
# In GitHub Codespaces
npm install
npm run dev
```

### Production (future)
- Deploy to Vercel
- Configure testnet contract
- Test with funded identity

---

## Security Considerations

1. **Never expose private keys** - Only WIF for session
2. **No mainnet** - MVP is testnet only
3. **Input validation** - Max lengths enforced
4. **XSS prevention** - React handles escaping
5. **No user HTML** - Text-only content

---

## Troubleshooting

### Common Issues

**"No identity found"**:
- Ensure identity is registered on testnet
- Check that the correct network is being used

**"Failed to connect"**:
- Check internet connection
- Verify testnet is accessible

**"Document not found"**:
- Check document ID is correct
- Verify document was created successfully

---

*Last updated: October 2026*
*Version: 0.1.0 MVP*
*Network: Dash Platform Testnet Only*
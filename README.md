# Whispr

**Say it without saying who you are.**

A decentralized forum/community DApp built on Dash Platform testnet.

## ⚠️ Important

- **Testnet Only**: This MVP runs on Dash Platform testnet only. Do NOT use mainnet.
- **Pseudonymous, Not Anonymous**: Users login with Dash Platform identity but display as pseudonyms (e.g., "Anonymous #7F32"). This is NOT cryptographic anonymity - the underlying identity is stored as the document owner.

## Features

- Browse and create forums
- Join/leave forums
- Create pseudonymous posts
- Comment on posts
- React to posts (like)
- All data stored on Dash Platform (no centralized database)

## Tech Stack

- Next.js 15
- React 19
- Tailwind CSS
- @dashevo/evo-sdk (Dash Platform)

## Getting Started

```bash
# Install dependencies (in Codespaces)
npm install

# Run development server (in Codespaces)
npm run dev
```

## Documentation

See [docs/whisper-mvp.md](docs/whisper-mvp.md) for detailed architecture and contract documentation.

## Project Structure

```
whispr/
├── app/                    # Next.js app router pages
│   ├── page.tsx           # Landing page
│   ├── login/             # Login page
│   └── forums/            # Forum pages
│       ├── page.tsx       # Forum discovery
│       ├── create/        # Create forum
│       └── [forumId]/     # Forum detail
├── lib/
│   ├── platform/          # Dash Platform integration
│   │   ├── client.ts      # SDK client
│   │   ├── identity.ts    # Identity management
│   │   ├── session-context.tsx  # React context
│   │   └── ...
│   ├── contracts/         # Platform contract definitions
│   └── forum.ts           # Forum operations
└── docs/                   # Documentation
```

## Disclaimer

This is an MVP/experimental application for testing on Dash Platform testnet only.

- NOT for production use
- NOT connected to Dash mainnet
- Does NOT provide cryptographic anonymity
- All data is publicly visible on the testnet blockchain

## License

MIT
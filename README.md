# Shadow OS

Shadow OS is a behavioral operating system for humans.

Instead of acting like a generic productivity tool, it is designed to feel like a private behavioral mirror: something that stores decisions, tracks mental state, exposes intent-action gaps, simulates consequences, encrypts private truth, and nudges the user when old patterns start taking over.

## What is built

This repository currently ships a zero-cost product build that runs fully in the browser:

- thought logging
- decision consequence tracking
- mental state logging
- commitments and self-trust tracking
- private vault entries
- life score calculation
- pattern extraction engine
- future simulation mode
- shadow vs real-you comparison
- identity modes and coach voice customization
- client-side encrypted vault entries
- browser notification nudges
- export/import backups for reliability

## Why this version is reliable

- Offline-first: works without backend setup
- Local persistence: user data survives refreshes
- Snapshot normalization: imported and stored data is validated into a safe shape
- Backup portability: users can export and re-import their full system memory
- Seeded demo state: first-time users can immediately explore the product
- Cloud features activate only when their environment variables are present

## Tech stack

- React
- Vite
- Plain CSS with responsive layouts
- Local storage for core persistence
- Optional Firebase auth and Firestore sync
- Optional Vercel API route for OpenAI coaching
- Web Crypto for local vault encryption

## Run locally

```bash
npm install
npm run dev
```

For a production build:

```bash
npm run build
```

## Project structure

```text
shadow-os/
  api/
  docs/
  src/
    data/
    lib/
  .env.example
  README.md
```

## Production path

The current version is intentionally deployable for `INR 0` as a strong product demo. It includes:

- optional Firebase sign-in and Firestore sync when env keys are present
- secure server-side AI reflections through a Vercel API route
- graceful fallback to local-only mode when cloud services are not configured
- encrypted vault entries in supported browsers
- browser notification nudges without any backend

The best next extension is:

- encrypted remote vault sync
- service-backed push or email delivery
- richer OpenAI-powered summaries, nudges, and simulations

See [deployment-notes.md](docs/deployment-notes.md) for the upgrade path.

## Positioning

Say:

> "I'm building a behavioral operating system for humans."

Not:

> "I built an AI website."

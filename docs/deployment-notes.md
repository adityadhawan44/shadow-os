# Shadow OS Deployment Notes

## Current build

This version is intentionally offline-first, with optional production services:

- Runs fully on React + Vite
- Uses local storage for durability
- Supports export/import backup for portability
- Requires no paid infra to demo or deploy
- Can optionally enable Firebase auth and Firestore sync from environment variables
- Can optionally enable secure OpenAI coaching through the Vercel `api/coach.js` route
- Includes client-side vault encryption with Web Crypto in supported browsers
- Includes browser notification nudges as the no-backend reminder path

## Best next production upgrade

### Frontend

- Deploy to Vercel

### Backend

- Firebase Auth for sign-in
- Firestore for synced logs, vault entries, and commitments
- Client loads Firebase from Google's hosted modules at runtime to keep install footprint lighter

### AI layer

- Start with lightweight OpenAI structured prompts for:
  - weekly pattern summaries
  - future simulation narratives
  - personalized nudges

## Reliability checklist

- Add auth guard before vault sync
- Encrypt vault content before storing remotely as well as locally
- Add per-user Firestore collections
- Add service-backed push or email delivery if you want reminders outside the browser
- Add rate limits for AI-triggering actions
- Add schema version migrations for stored snapshots

## Environment

Use `.env.example` as the template for future integration keys.

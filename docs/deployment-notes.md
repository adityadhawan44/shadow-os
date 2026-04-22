# Shadow OS Deployment Notes

## Current MVP

This version is intentionally offline-first:

- Runs fully on React + Vite
- Uses local storage for durability
- Supports export/import backup for portability
- Requires no paid infra to demo or deploy

## Best Next Production Upgrade

### Frontend

- Deploy to Vercel

### Backend

- Firebase Auth for sign-in
- Firestore for synced logs, vault entries, and commitments

### AI Layer

- Start with lightweight OpenAI structured prompts for:
  - weekly pattern summaries
  - future simulation narratives
  - personalized nudges

## Reliability Checklist

- Add auth guard before vault sync
- Encrypt vault content before storing remotely
- Add per-user Firestore collections
- Add rate limits for AI-triggering actions
- Add schema version migrations for stored snapshots

## Environment

Use `.env.example` as the template for future integration keys.

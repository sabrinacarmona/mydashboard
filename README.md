# Sabrina's Control Centre v2.0

A private, Apple-Dark-Mode life-optimization dashboard with contextual Personal/Professional switching, real-time WebSocket updates, and Gemini AI trip extraction.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, Tailwind CSS v4 |
| Backend | Node.js 20, Express v5 |
| Database | SQLite via Prisma ORM |
| Validation | Zod (all Gemini outputs validated before save) |
| Real-Time | WebSockets (`ws`) + Google Cloud Pub/Sub Webhooks |
| AI | Gemini 2.5 Flash (`@google/genai`) |
| Testing | Jest + Supertest (22 integration tests) |
| Auth | Password-based Bearer token gate |

## Architecture

```
client/                    React 19 + Vite 7 frontend
  src/components/          UpcomingTrips, Calendar, KanbanBoard, DailyRituals, ...
  src/contexts/            WebSocketContext (real-time push)
  src/utils/api.js         Centralized fetch with auth headers
server.js                  Express v5 monolith (REST + WebSocket + cron)
prisma/schema.prisma       Source of truth: Trip, TripComponent, Task, Ritual, Note, Pomodoro
schemas/zodSchemas.js      Zod validation for all LLM payloads
utils/                     deduplicateTrips() and helpers
tests/                     api.test.js (18 endpoint tests), deduplication.test.js (4 tests)
```

## Setup

```bash
# 1. Install dependencies (root + client)
npm install
cd client && npm install && cd ..

# 2. Configure environment
cp .env.example .env   # then fill in the values below

# 3. Generate Prisma client
npx prisma generate

# 4. Run (backend on :3000, frontend on :5173)
npm run dev
```

### Required Environment Variables

| Variable | Purpose |
|----------|---------|
| `AUTH_PASSWORD` | Password for the login gate and Bearer token auth on all `/api/*` routes |
| `GEMINI_API_KEY` | Gemini 2.5 Flash for trip/inbox extraction |
| `DATABASE_URL` | `"file:./database.db"` for local, `"file:/data/database.db"` on Railway |
| `GOOGLE_CREDENTIALS_JSON` | OAuth2 credentials block for Google Calendar + Gmail |

## Context Engine

Every component fetches data scoped to the active context:

```
GET /api/tasks?context=professional
```

The backend filters via Prisma: `where: { contextMode: { in: [context, 'both'] } }`. Toggle between Personal and Professional from the header.

## Auth

All `/api/*` routes (except `POST /api/auth/login`) require `Authorization: Bearer <password>`. The React frontend renders a `LoginGate` that blocks the dashboard until the correct password is entered.

## Testing

```bash
npm test
```

Runs 22 tests across 2 suites: API integration tests (auth, tasks, notes, rituals, pomodoros) and trip deduplication unit tests.

## Deployment

Designed for Railway with a persistent volume at `/data`. See the [Handover](./Handover) document for the full GCP Webhook setup playbook, database backup/restore procedures, and developer FAQ.

## License

Private.

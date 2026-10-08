# HackTrack - Hackathon Dashboard

A full-stack app for tracking hackathons, finding teams and collaborating, with a **recommendation engine** and a **natural-language AI filter**.

- Frontend: React 18, React Router, FullCalendar, Socket.IO client
- Backend: Node.js, Express, MongoDB (Mongoose), JWT, Socket.IO
- Deploy: Netlify (frontend) + Render (backend) - see [deploy-instructions.md](deploy-instructions.md)
- Demo guide: [WALKTHROUGH.md](WALKTHROUGH.md)

## Features

| Area | What it does |
|------|--------------|
| Landing page | Product pitch, how-it-works, and a live AI-filter demo at `/` |
| Auth | OTP email registration, password login, JWT sessions, Google OAuth |
| Dashboard | Track hackathons with rounds, status, team and notifications; search, filter, sort |
| **AI filter** | Type plain English such as `devpost teams with open slots next month`; parsed locally into platform / status / date / open-slot / skill filters (`src/utils/aiFilter.js`) |
| **Recommendations** | Ranks open public teams by platform history, timing, open slots and skills; ranks public-profile teammates by complementary skills (`server/services/recommendationEngine.js`) |
| Public hackathons | Browse public teams, request to join, withdraw requests |
| Teams | Invites, join-request approval, team chat, round remarks, idea voting |
| Friends and DMs | Friend requests, private messages, profile privacy |
| Calendar and sync | Calendar with round dates, Google Calendar sync, notifications |

### Where the smart features appear

| Page | AI filter | Recommendations |
|------|-----------|-----------------|
| `/dashboard` | filters your hackathons | recommended teams and teammates |
| `/worlds` | filters public teams | recommended teams with one-click "Request to join" |
| `/friends` | filters suggested teammates | recommended teammates |
| `/` | live demo on sample data | - |

API: `GET /api/recommendations/hackathons?limit=6` and `GET /api/recommendations/teammates?limit=6` (JWT required). Only profiles marked public are ever suggested.

## Run locally

Prerequisites: Node.js 18+ and a MongoDB instance (local or Atlas).

```bash
npm install
cd server && npm install && cd ..

cp env.example .env     # set MONGODB_URI, JWT_SECRET, and email credentials for OTP

# Terminal 1 - backend on :10000
cd server && npm start

# Terminal 2 - frontend on :3001
npm start               # (set PORT=3001; Google OAuth is configured for localhost:3000/3001)
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3001 |
| API | http://localhost:10000/api |
| Health | http://localhost:10000/health |

If the dev server fails with `options.allowedHosts[0] should be a non-empty string`, start it with `DANGEROUSLY_DISABLE_HOST_CHECK=true`.

OTP emails need real SMTP credentials. For a quick local demo without email, create a user directly in MongoDB through the `UserMongoDB` model (password is hashed by a pre-save hook) and log in with email + password.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm start` | Frontend dev server |
| `npm run build` | Production build |
| `npm test -- --watchAll=false` | Frontend tests (AI filter parser) |
| `npm run storybook` | Component stories |
| `cd server && npm start` | Backend |
| `cd server && npm run dev` | Backend with nodemon |
| `cd server && npm test` | Backend tests (recommendation engine) |

## Project layout

```
src/
  components/        UI pages (Dashboard, HackathonWorlds, Friends, Landing, ...)
    AIFilterBar/     natural-language filter input
    Recommendations/ recommendation panel and cards
  utils/aiFilter.js  query parser + list filters (tested)
  utils/recommendationApi.js
server/
  routes/            REST API (auth, hackathons, worlds, users, recommendations, ...)
  services/          recommendationEngine.js (pure, tested), email and OTP services
  models/            Mongoose models
  test/              node:test suites
```

## Data model (hackathon)

```js
{
  name, platform,            // Devpost | HackerEarth | Topcoder | CodeChef | HackerRank | Other
  email, team,               // owner email, "Solo" | "Team"
  date, rounds, roundDates,
  status,                    // Planning | Participating | Won | Qualified | Didn't qualify
  isPublicWorld, maxParticipants, teamMembers, joinRequests,
  notifications, remarks
}
```

## License

MIT

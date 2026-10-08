# HackTrack Walkthrough and Demo Script

A guided tour of every feature, with suggested talking points. Total demo time is about 6 minutes.

## 0. Setup (before you present)

```bash
cd server && npm run seed:demo      # demo accounts + sample hackathons
cd server && npm start              # backend on :10000
npm start                           # frontend on :3001
```

Log in as **demo@hack.dev / password123**. Other seeded accounts (same password): `priya@hack.dev` (expert designer, owns the "Campus AI Sprint" team), `sam@hack.dev` (ML), `pat@hack.dev` (private profile, never recommended).

## 1. The one-line pitch

> "HackTrack is the command center for hackers. It tracks every hackathon you play, and its recommendation engine and natural-language filter help you find the right team and the right event."

## 2. Landing page (`/`)

**Show:** the hero, the capabilities grid, "How it works" (Track, Get matched, Ship together), then the **live AI filter demo**.

**Say:**
- "The problem: hackers juggle deadlines across Devpost, HackerEarth, Topcoder and group chats."
- In the demo box, click the chips or type `solo hackathons`, then `devpost with open slots`. "I'm not picking dropdowns. I describe what I want and it shows how it understood me: platform, status, date, open slots."
- "This demo runs on sample data. Inside the app it filters real data."

## 3. Sign in

**Show:** `/login` with email and password. Mention OTP-verified registration and Google OAuth.

**Say:** "Registration is OTP-verified by email. Sessions use JWTs. Rate limiting and input sanitization are on the backend."

## 4. Dashboard (`/dashboard`)

**Show:**
1. Stats and the hackathon list.
2. **AI filter bar.** Type `won on devpost`. The line "Understood: platform: Devpost · status: Won" appears with a match count. Then try `solo planning` and `past hackathons`.
3. **Recommended hackathons for you.** Each card has a percentage match and plain-English reasons.
4. **Teammates you might click with.** Type `expert` in its filter bar.

**Say:**
- "The AI filter is a deterministic parser that runs in the browser. There is no API key, no latency and no data leaves the machine. It understands platforms, status, solo or team, relative dates like `next month` and `in 10 days`, open slots, and free-text keywords."
- "The recommendation engine scores every open team from 0 to 100. Platform history counts, a 1 to 3 week prep window counts, open slots count, and skills matching the title count. Teams you own, already joined, that are full or in the past are excluded."
- "For teammates it rewards **complementary** skills, not clones. I'm a React/Node dev, so a designer ranks above another React dev. Only people who made their profile public are ever shown. The private profile `pat@hack.dev` never appears."

## 5. Public hackathons (`/worlds`)

**Show:**
1. The recommendation strip at the top, then the full list of public teams.
2. AI filter: `hackerearth upcoming` or `teams with open slots`.
3. Click **Request to join** on a recommended team and send a message.

**Say:** "Discovery and action are one step. The recommendation card opens the same join-request flow as the main list. The team leader gets a notification and approves or rejects."

## 6. Notifications (`/notifications`)

**Show:** Log in as `priya@hack.dev` in another window and open Notifications to see the join request. Approve it.

**Say:** "Approved members land in the team, get team chat and appear in the team page."

## 7. Friends (`/friends`)

**Show:** Teammate recommendations with the filter, and the friend request form. Click **View profile** on a suggestion.

**Say:** "Friends can DM each other and see each other's current teams. Profile privacy is respected: private profiles return 403."

## 8. Rest of the product (30 seconds each)

| Page | Point to make |
|------|---------------|
| `/add-hackathon` | Multi-section form with rounds, round dates, reminders |
| `/calendar` | Rounds and deadlines visualized, including joined hackathons |
| `/google-sync` | Push events to Google Calendar |
| `/team/:id`, `/chat/:id` | Team page, round remarks, real-time chat over Socket.IO |
| `/profile` | Skills and links. **Skills feed the recommendation engine** |

## 9. Under the hood (for technical questions)

- **Frontend:** React 18 and React Router. `src/utils/aiFilter.js` has the parser and filters, and `AIFilterBar` and `Recommendations` are the reusable UI.
- **Backend:** Express and Mongoose. `server/services/recommendationEngine.js` is pure functions (no DB), so it is unit-tested. `server/routes/recommendations.js` loads data and calls it.
- **Endpoints:** `GET /api/recommendations/hackathons` and `/teammates`, both JWT-protected.
- **Tests:** 13 frontend tests (parser, date windows, filtering) and 7 backend tests (scoring, exclusions, complementary skills, friend boost).
- **Why not an LLM?** "Deterministic, instant, free and private. The filter has a clear contract (a structured filter object), so an LLM could replace the parser later without touching the UI."

## 10. Likely questions

| Question | Answer |
|----------|--------|
| Is the AI filter really AI? | It is natural-language understanding by rules. It maps free text to structured filters. It is offline by design, and the parser is swappable for an LLM. |
| How are matches scored? | Weighted rules: platform history up to 35, timing up to 25, open slots up to 20, title/skills up to 15, plus a small activity bonus. Each score ships with reasons. |
| Cold start for new users? | With no history, scores rely on timing, open slots and skills. Adding skills in the profile improves results immediately. |
| Privacy? | Only public profiles are recommended, and emails of private users are never returned. |
| Scale? | Candidate pools are capped (200 users) and scoring is O(n). A cache or precompute can be added later. |

## 11. Checklist before presenting

- [ ] Backend and frontend running, `npm run seed:demo` done
- [ ] Logged in as `demo@hack.dev`; second window as `priya@hack.dev`
- [ ] Browser zoom around 100% and window wide enough for the grid
- [ ] Have the landing page open first

# Planning

## Project Overview

Digital Second Brain — a full-stack personal knowledge engine with AI-powered note-taking, automatic semantic note linking, habit/mood tracking, and an interactive knowledge graph visualization.

- **Backend:** Node.js + Express 5 + Mongoose 9 + JWT auth + Google Gemini AI
- **Frontend:** React 19 + Vite 7 + Tailwind CSS 4 + react-force-graph-2d + Three.js
- **Deployment:** Netlify (frontend), backend TBD
- **CI/CD:** GitHub Actions (CI on push/PR, publish on release)
- **Auth:** JWT httpOnly cookies with .env configuration

## Current State (v1.1.0)

### Implemented Features
- User auth (register/login/logout with JWT httpOnly cookies)
- Note CRUD (single + batch up to 25, search, tag filter)
- Automatic keyword extraction and semantic note linking (TF-style scoring, concept aliases)
- Manual note linking (bidirectional pinning)
- Knowledge graph visualization (force-directed 2D graph)
- Habit tracking (gym/study/sleep with streaks)
- Mood tracking (6 moods, 3 sources: manual/heuristic/Gemini)
- AI content suggestions, related note recommendations, forgotten ideas
- AI face mood analysis via webcam + Gemini Vision
- Voice note capture (Web Speech API)
- Bulk note import (structured text parsing)
- Security: Helmet, CORS, rate limiting, MongoDB injection protection
- 3D interactive ByteMascot mascot (Three.js)
- Retro/neural UI theme

### Known Gaps
- No tests (backend `npm test` has placeholder tests)
- No client-side routing (uses `currentView` state — no deep linking)
- No pagination on notes/graph endpoints
- No bulk delete or note archiving (hard delete only)
- Custom habits not supported (3 hardcoded habits)
- No habit log deletion endpoint
- Search is basic regex — no full-text index or relevance ranking
- No note versioning or collaboration
- AI features disabled by default (`ENABLE_GEMINI_FEATURES=false`)
- No email verification or password reset
- No OAuth (email/password only)
- No loading skeletons or error boundaries
- Minimal accessibility (ARIA, keyboard nav)
- No API documentation (Swagger/OpenAPI)

### Recent Improvements (v1.1.0)
- Replaced Jenkins pipeline with GitHub Actions CI (runs tests + build on push/PR)
- Added frontend build step to CI (catches build errors early)
- Created `.env` configuration files for both backend and frontend
- Fixed graph canvas label overlapping (truncated text, dark backgrounds)
- Moved graph info panel to right side to avoid overlap with status messages
- Truncated overflowing keyword lists in note panel
- Reduced dashboard heading size for mobile
- Cleaned up dashboard — removed redundant cards, fake metrics, and Process Nodes section
- Simplified dashboard layout to core essentials: BrainCore, Recent thoughts, System log, Navigation

## Phased Plan

### Phase 1 — Foundation & Quality (Current)
- [ ] Scaffold test suite (Jest + Supertest for API integration tests)
- [ ] Add React Router for client-side routing and deep linking
- [ ] Add pagination (`limit`/`skip`) to `GET /api/notes` and `GET /api/notes/graph`
- [ ] Add bulk delete endpoint (`DELETE /api/notes/bulk`)
- [ ] Add note archiving (soft-delete: `isArchived` flag)
- [ ] Fix README inaccuracies (e.g., "OpenAI's Gemini")

### Phase 2 — User Experience
- [ ] Add loading skeletons and spinners
- [ ] Add React error boundaries
- [ ] Improve accessibility (ARIA labels, keyboard navigation)
- [ ] Add dark/light theme toggle
- [ ] Add note versioning (simple diff history)
- [ ] Add image/file attachment support to notes
- [ ] Add full-text search with MongoDB text indexes for relevance ranking

### Phase 3 — Auth & Accounts
- [ ] Email verification flow
- [ ] Password reset flow
- [ ] OAuth integration (Google, GitHub)
- [ ] Rate limit remaining unprotected routes (habits, notes)
- [ ] Enable secure cookies in production

### Phase 4 — Habits & Mood Expansion
- [ ] Custom habit creation/deletion/editing endpoints
- [ ] Configurable habit goals and types
- [ ] Habit log deletion endpoint
- [ ] Mood system configuration (custom moods)
- [ ] Habit analytics dashboard (charts, trends)

### Phase 5 — AI & Intelligence
- [ ] Enable AI features by default with graceful degradation
- [ ] Optimize Gemini prompt engineering for cost/quality
- [ ] Add streaming AI responses (SSE)
- [ ] Auto-tag suggestions on note creation
- [ ] Weekly AI digest/summary email

### Phase 6 — Scale & Performance
- [ ] WebSocket-based real-time sync (collaboration notes)
- [ ] Redis caching for graph data and frequent queries
- [ ] Database indexing audit and query optimization
- [ ] File upload support (S3/Cloudinary for attachments)
- [ ] Rate limit tuning based on production usage patterns

### Phase 7 — Polish & Launch
- [ ] OpenAPI/Swagger documentation
- [ ] E2E tests (Playwright/Cypress)
- [ ] Performance budget and Lighthouse audit
- [ ] PWA support (offline mode, service worker)
- [x] CI/CD pipeline (GitHub Actions)
- [ ] Backend deployment (Railway/Fly.io/Render)

## Architecture Decisions

- **JWT over sessions** — Stateless auth, simpler scaling, httpOnly cookies prevent XSS
- **No ORM** — Mongoose provides schema validation + MongoDB ODM without full ORM overhead
- **Services layer** — Business logic extracted from controllers for testability
- **Keyword-based linking** — Lighter weight than embeddings; can be upgraded to vector search later
- **Single-page frontend without router** — Intentional for v1 simplicity; React Router to be added in Phase 1

## Tech Debt & Notes

- `secure: false` on cookies — temporarily set for local testing; must flip before production
- `ENABLE_GEMINI_FEATURES=false` by default — users must explicitly opt in
- No `.env` validation at startup — app won't fail fast on missing required vars
- Frontend `App.jsx` at ~1429 lines — major refactor candidate as features grow

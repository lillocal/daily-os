# Daily OS — Developer Handoff Document

This document gives a new Claude conversation everything it needs to continue developing Daily OS without losing context.

---

## What This App Is

**Daily OS** is a personal wellness PWA built for Nik Hall, who runs Love Your Work Co., a marketing consultancy in Agnes Water, Queensland. Nik is neurodivergent (ADHD, autism, BED, PMDD, depression) and built this app to track her own patterns and get AI-powered coaching from her own data.

The app is a single-file PWA deployed on Netlify, backed by Supabase, using Claude Sonnet as the AI layer via Netlify serverless functions.

**Live URL:** https://daily-os-app.netlify.app  
**GitHub:** https://github.com/lillocal/daily-os  
**Supabase project:** "Daily OS" under Love Your Work Co.  
**Anthropic API key:** stored in Netlify env var `ANTHROPIC_API_KEY`

---

## File Structure

```
index.html                          — The entire app (3144 lines, single-file PWA)
manifest.json                       — PWA manifest
sw.js                               — Service worker (cache version daily-os-v8)
icon.svg                            — App icon
setup.sql                           — Supabase schema v7
README.md                           — Deployment docs
netlify/
  functions/
    claude.js                       — Proxy for all Claude API calls (chat, pattern read, etc.)
    parse-medical.js                — Medical PDF extraction via Claude Documents API
```

---

## Tech Stack

- **Frontend:** Vanilla JS, single `index.html`, no build step
- **Hosting:** Netlify (auto-deploys from GitHub master)
- **Database:** Supabase (Postgres), anon key in app settings
- **AI:** Anthropic Claude Sonnet 4 via two Netlify functions
- **Charts:** Chart.js 4.4.0 (CDN)
- **Auth:** None — single-user personal app
- **Offline:** Service worker, network-first for HTML, cache-first for static assets

---

## Supabase Schema (v7)

Table: `daily_checkins`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | auto |
| created_at | TIMESTAMPTZ | auto |
| entry_date | DATE | |
| type | TEXT | `morning`, `afternoon`, `quicklog`, `spot` |
| cycle_day | INTEGER 1–35 | |
| mood | INTEGER 1–5 | |
| mood_note | TEXT | |
| energy | INTEGER 1–5 | |
| energy_note | TEXT | |
| sleep_score | INTEGER 0–100 | Garmin |
| body_battery | INTEGER 0–100 | Garmin |
| hrv_status | TEXT | poor/low/balanced/good |
| recovery_advisory | TEXT | recover/maintain/push |
| steps_yesterday | INTEGER | |
| weight | NUMERIC(5,2) | kg |
| work_intention | TEXT | morning only |
| body_intention | TEXT | morning only |
| focus_quality | TEXT | on_target/scattered/hyperfocused/checked_out |
| body_awareness | TEXT | checked_in/drifted/autopilot |
| movement | TEXT | yes/a_bit/no |
| work_status | TEXT | done/in_progress/didnt_happen |
| note | TEXT | quick logs store full transcript here |

---

## App Architecture

### State Variables (global JS)
```js
sbClient          // Supabase client or null
entries           // all loaded entries array (most recent first)
aboutMe           // string from localStorage 'about_me'
currentView       // 'checkin' | 'insights' | 'log' | 'settings'
checkInStep       // current step index in check-in flow
checkInType       // 'morning' | 'afternoon'
checkInData       // object being built during check-in
todayEntries      // { morning: entry|null, afternoon: entry|null }
chartInstance     // Chart.js mood/energy chart instance
weightChartInstance // Chart.js weight chart instance
synthesisRunning  // bool guard for pattern read
fullAnalysisRunning // bool guard for full analysis
submitInProgress  // bool guard for check-in submit
qlConversation    // array of {role, content} for active quick log
qlDone / qlFetching / qlSaving // quick log state guards
spotData          // { mood, energy, mood_note, energy_note, note }
editingId / editingData // current edit modal state
```

### localStorage Keys
```
sb_url              — Supabase project URL
sb_key              — Supabase anon/publishable key
local_entries       — fallback entries when offline or no Supabase
about_me            — free text context injected into all AI prompts
profile_height      — cm
profile_start_weight — kg
profile_goal_weight — kg
health_history      — JSON object: { diagnoses[], medications[], blood_results[], flagged_findings[], sources[] }
pattern_reads       — array of { ts, label, text, entryCount } (last 20)
full_analyses       — array of { ts, label, text, entryCount } (last 10)
```

### Critical Helper Functions
```js
esc(str)                    // HTML escape — MUST use on all user data in innerHTML
todayStr()                  // Returns YYYY-MM-DD using LOCAL date (not UTC — critical for QLD UTC+10)
getRecentEntries(days)      // Filters entries, parses dates at T12:00:00 local to avoid UTC offset
calcAvg(arr, field)         // Returns toFixed(1) average or null
getHealthHistoryContext()   // Builds prompt string from localStorage health_history
getProfileContext()         // Builds prompt string from profile localStorage keys
buildQLSystemPrompt()       // Full system prompt for quick log AI
```

---

## Feature Inventory

### Check-in Types
1. **Morning check-in** — cycle day, Garmin stats (sleep/battery/HRV/recovery/steps), weight, mood+note, energy+note, work intention, body intention
2. **Afternoon check-in** — mood+note, energy+note, focus quality, food awareness, movement, work status, note
3. **Spot check-in** — fast mood+energy+notes, any time, no AI, feeds all metrics/charts. Shows time from `created_at` in log.
4. **Quick log** — open-ended AI conversation. Coach observes then asks (not just questions). User controls length via "Wrap it up →" button. Saves full transcript.

### FAB Action Sheet
Tap + opens sheet with two options: Quick log / Spot check-in. Closes on backdrop tap.

### Insights Tab
- Pattern read (7-day, Claude Sonnet, saves history)
- **Full analysis** (30-day, all health history, medical correlations, 800 tokens, saves history)
- Cycle phase card
- 14-day mood/energy averages
- Mood+energy trend chart (14 days)
- **Weight chart** (30 days, only shows if ≥3 weight entries)
- Work intention completion rate
- Movement vs mood comparison
- Day trajectory (morning→afternoon mood delta)

### Post-Check-in Observation
After submitting a morning or afternoon check-in, the done screen fires an async AI call (120 tokens) that shows 1-2 sentences comparing today's numbers against recent history. Non-blocking. Shows "nothing" if not interesting enough.

### Health History (Setup tab)
- Upload PDFs → `parse-medical.js` sends to Claude as native document
- Claude extracts: medications, diagnoses, blood results (with flags), flagged summary, other findings
- Review panel before saving
- Stored in localStorage `health_history` with dedup logic
- Flagged results + diagnoses injected into ALL AI prompts automatically
- Explicit medical correlation instructions in every prompt

### Log Tab
- Full entry history, grouped by date
- Sort order per day: morning → afternoon → spot → quicklog
- Edit (✎) and delete (✕) buttons
- Spot entries show time from `created_at`
- Edit modal handles morning/afternoon/spot differently (spot gets minimal fields)
- Quick logs show transcript bubbles, no edit

### Settings/Setup Tab
- Health history upload card (top)
- Profile: height, starting weight, goal weight
- About me: free text injected into AI prompts
- Supabase config
- Notifications (7am + 4pm push via service worker)
- Add to home screen instructions
- Data: upload local to Supabase, export JSON, clear local

---

## Netlify Functions

### `claude.js`
- Proxies all AI calls to keep API key server-side
- Validates `messages[]` and `system` required
- Caps `max_tokens` at 1000
- Consistent CORS headers on all response paths
- Used by: quick log, pattern read, full analysis, post-checkin observation

### `parse-medical.js`
- Receives `{ pdf_base64, media_type, filename }`
- Validates `media_type` against whitelist (pdf, jpeg, png, gif, webp)
- Sanitises `filename` before injecting into prompt
- 6MB file size limit (8MB base64)
- Sends as Claude native document type
- Returns structured JSON: `{ extracted: { doc_type, doc_date, doc_title, medications[], diagnoses[], blood_results[], other_findings[], flagged_summary[] }, filename }`
- 2000 max tokens for extraction

---

## AI Prompt Architecture

### Quick Log System Prompt (`buildQLSystemPrompt`)
- Persona: behaviour coach, knows Nik's full background
- Includes: last 14 entries summary, cycle phase, about me, profile stats, health history context
- Instruction: observe + ask (not just interrogate). Lead with what you notice, then ask.
- No forced turn limit — user wraps via button
- JSON responses: `{"type":"question","text":"..."}` or `{"type":"done","text":"...","action":"..."}`

### Pattern Read (`runWeeklySynthesis`)
- Last 7 days of entries
- 400 max tokens
- Structure: What I'm seeing / The thing worth paying attention to / One thing to try
- Saves to `pattern_reads` localStorage as plain text (not HTML — XSS prevention)

### Full Analysis (`runFullAnalysis`)
- Last 30 days of all entry types
- 800 max tokens
- Structure: What the data actually shows / What's worth investigating / What's working / One concrete thing worth trying
- Explicitly told to connect symptoms to lab results, medications, cycle phase
- Saves to `full_analyses` localStorage

### Post-Check-in Observation (`getCheckInObservation`)
- 120 max tokens
- Returns "nothing" if nothing interesting
- Only fires if ≥3 recent entries exist
- Non-blocking, async after `renderComplete()`

---

## Security Notes

All user text is passed through `esc()` before innerHTML injection. Pattern reads stored as plain text, re-rendered via `renderPatternReadHtml()` — never injecting stored HTML. Legacy HTML pattern reads have `<script>` tags stripped before display. `parse-medical.js` validates media_type against a whitelist and sanitises filenames.

---

## Known Issues Fixed in This Build

Running list of bugs caught across multiple audit passes:

- `hrv_status` and `recovery_advisory` escaped in both `buildGarminSnap` and `buildLogEntry`
- `todayStr()` uses local date components (not `toISOString()`) — critical for UTC+10
- `getRecentEntries()` parses dates at noon local
- `moveRate` uses only entries with `movement != null` as denominator
- `submitInProgress` double-submit guard with finally block
- `synthesisRunning` in finally block + null check
- `saveQuickLog` uses `.select().single()` for real Supabase UUID
- Pattern reads stored as plain text not HTML
- `renderPatternReadHtml()` re-renders safely from text
- Legacy HTML pattern reads strip `<script>` tags
- `wrapUpQL` restores wrap button if AI returns non-done
- `editEntry` modal title handles spot type
- Medication dedup key consistent: `(m.name + (m.dose || '')).toLowerCase()`
- `getProfileContext()` uses `\n` escape not literal newline
- `buildGarminSnap` and `renderComplete` use `!= null` for numeric fields (sleep/battery/steps can be 0)
- `runWeeklySynthesis` and `runFullAnalysis` use `!= null` for same fields in data text
- `parse-medical.js` validates media_type, sanitises filename
- `claude.js` has CORS headers on all response paths including 405
- Spot check-in timestamps show from `created_at`
- Spot check-ins shown on check-in done screen (`todaySpots`)
- Medication dose/purpose null guards in `getHealthHistoryContext()`
- Literal newlines in JS string literals and regex literals fixed (caused blank screen)

---

## Development Conventions

- **Never use literal newlines inside JS string literals or regex literals** when generating code via Python scripts. Use `\\n` escape sequences. Always run `node --check` on the extracted JS before shipping.
- All innerHTML injection must use `esc()` helper
- Numeric fields that can legitimately be 0 must use `!= null` not falsy checks
- Date strings always parsed at `T12:00:00` local (never UTC) to avoid midnight timezone bugs
- AI prompts build their context via: `aboutMe` + `getProfileContext()` + `getHealthHistoryContext()`
- `saveEntry()` handles Supabase with localStorage fallback — use this for all writes
- The Anthropic API key never touches the browser — all Claude calls go through Netlify functions
- `max_tokens` cap in `claude.js` is 1000 — pattern read uses 400, full analysis uses 800, post-checkin uses 120, quick log uses default 200

---

## Deployment Checklist

1. Run SQL migration in Supabase if schema changed
2. Push files to GitHub — Netlify auto-deploys in ~30 seconds
3. Only `index.html` changes for most features
4. `netlify/functions/` only changes if adding new AI call types
5. `setup.sql` only changes if adding columns
6. `sw.js` cache version bump if adding new static assets
7. Test: spot check-in saves → log shows timestamp → insights loads → full analysis returns → health upload works

---

## Nik's Context (for AI prompts)

- 37 years old, Agnes Water QLD (UTC+10, no daylight saving)
- Pixel Pro 10 XL, Chrome Android
- ADHD, autism, binge eating disorder, PMDD, depression, hypersensitivity/anxiety
- Medications: Ozempic (weight management), Prozac (daily), Vyvanse (ADHD/BED)
- Notable blood results (Jan 2026): Androstenedione LOW, Neutrophils LOW, B12 borderline, Cholesterol slightly elevated
- Runs Love Your Work Co., a marketing consultancy
- Voice-to-text user — input may be casual/rough
- Direct, no-bullshit communication style
- Neurodivergent patterns: novelty collapse after 2-3 weeks, ADHD executive function, PMDD in luteal phase

---

## What To Give Claude When Starting a New Session

1. This HANDOFF.md file
2. The current `index.html` file (the full app)
3. The current `netlify/functions/claude.js`
4. The current `netlify/functions/parse-medical.js`
5. Tell Claude: "We are continuing development of Daily OS. Read the handoff doc first, then the code files. Do not start building anything until you confirm you understand the architecture."

---

## Release Workflow Safety

- Check the live Netlify deploy commit before editing; do not assume the local repo is the latest source of truth
- If GitHub/Netlify are ahead of local, reconcile that first, then build on top of the reconciled state
- Keep unsynced local app data visible until Supabase upload actually succeeds; do not clear local fallback data on partial sync failure

---

## Ideas Not Yet Built (parking lot)

- Export health history as structured PDF report
- Streak tracking (consecutive days logged)
- Medication logging / dose tracking over time
- Goal progress visualisation (weight trend vs goal line)
- Make/automation integration for external notifications
- Manual data entry backdating for missed days
- Sharing / multi-user (for Nik's mum)

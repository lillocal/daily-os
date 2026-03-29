# Daily OS

Your personal daily check-in, habit tracker, and AI behaviour coach. Logs mood, energy, Garmin health data, cycle phase, movement, and work intentions — twice a day, plus on-demand quick logs with AI follow-up coaching.

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | The entire app (single file PWA) |
| `manifest.json` | PWA metadata for home screen install |
| `sw.js` | Service worker — caching and push notifications |
| `icon.svg` | App icon |
| `setup.sql` | Supabase database schema |
| `netlify/functions/claude.js` | Serverless proxy for Claude API calls |

---

## Deploy to Netlify

1. Push all files to a GitHub repo (maintain the folder structure — `netlify/functions/claude.js` must be in that path)
2. Go to [netlify.com](https://netlify.com) → Add new site → Import from Git
3. No build settings needed — publish directory is `/`, no build command
4. Go to **Project configuration → Environment variables → Add a variable**
   - Key: `ANTHROPIC_API_KEY`
   - Tick "Contains secret values"
   - Value: your Anthropic API key from [console.anthropic.com](https://console.anthropic.com)
5. Deploy — you'll get a URL like `your-app.netlify.app`

---

## Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → paste the full contents of `setup.sql` → Run
3. Go to **Settings → API Keys** → copy your **Project URL** and **Publishable key**
4. Open your deployed app → **Setup tab** → paste both values → Save & connect

---

## Add to home screen

**Android (Chrome):** Three-dot menu → "Add to Home Screen"

**iPhone (Safari only):** Share button → "Add to Home Screen"

Once added, the app opens full screen with no browser UI.

---

## Enable notifications

Setup tab → Enable under "Browser push notifications".

Notifications fire at **7am** (morning check-in) and **4pm** (afternoon check-in).

Works reliably on Android. On iPhone requires iOS 16.4+ with the app added to home screen.

---

## Morning check-in fields

| Field | Type | Notes |
|-------|------|-------|
| Cycle day | Number | From Flo app |
| Sleep score | Number 0–100 | From Garmin morning report |
| Body battery | Number 0–100 | From Garmin |
| HRV status | Select | Poor / Low / Balanced / Good |
| Recovery advisory | Select | Recover / Maintain / Push |
| Steps (yesterday) | Number | From Garmin |
| Weight | Decimal kg | Before food/drink for consistency |
| Mood | Scale 1–5 | Optional context note |
| Energy | Scale 1–5 | Optional context note |
| Work intention | Text | The one thing that matters today |
| Body intention | Text | Movement, food, rest |

## Afternoon check-in fields

| Field | Type | Notes |
|-------|------|-------|
| Mood | Scale 1–5 | Optional context note |
| Energy | Scale 1–5 | Optional context note |
| Focus quality | Select | On target / Scattered / Hyperfocused / Checked out |
| Food awareness | Select | Checked in / Drifted / Autopilot |
| Movement | Select | Yes / A bit / No |
| Work status | Select | Done / In progress / Didn't happen |
| Note | Text | Anything worth capturing |

---

## Quick log (+ button)

Available any time from any screen. Type or voice-to-text anything — what you ate, how you're feeling, what happened. Claude asks up to 2 follow-up questions then wraps with a pattern observation and one concrete action. The full conversation is saved to your log.

---

## Insights

Once you have a week or two of data the Insights tab shows:
- Average mood and energy (14-day rolling)
- Mood and energy trend chart (14 days)
- Current cycle phase
- Movement vs mood comparison
- Day trajectory (morning-to-afternoon mood delta)
- Work intention completion rate
- **Weekly read** — Claude analyses your last 7 days of everything (numbers, notes, cycle phase) and surfaces real patterns with one actionable suggestion

---

## About Me (Setup tab)

Free-text field that gets included in every Claude prompt. Update it whenever your situation changes — medications, what's going on in your life, goals, stress levels. The more accurate it is, the smarter the follow-up questions and weekly reads become.

---

## Updating the app

When a new `index.html` is pushed to GitHub, Netlify auto-deploys within ~60 seconds. The service worker uses network-first fetching for `index.html` so updates load immediately on next open — no manual cache clearing needed.

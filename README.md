# Daily OS v1.8.0

Personal daily check-in, habit tracker, and AI behaviour coach. Logs mood, energy, Garmin health data, cycle phase, movement, work intentions, and on-demand spot check-ins — with AI coaching via quick log and pattern reads.

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | The entire app (single-file PWA) |
| `manifest.json` | PWA metadata for home screen install |
| `sw.js` | Service worker — caching and push notifications |
| `icon.svg` | App icon |
| `setup.sql` | Supabase database schema (run this first) |
| `netlify/functions/claude.js` | Serverless proxy for Claude AI (coaching + pattern reads) |
| `netlify/functions/parse-medical.js` | Serverless function for medical document extraction |

---

## Deploy to Netlify

1. Push all files to a GitHub repo — maintain the folder structure exactly (`netlify/functions/` must stay in that path)
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
2. Go to **SQL Editor** → New query → paste the full contents of `setup.sql` → Run
3. Go to **Settings → Data API** → copy your **Project URL** and **Publishable (anon) key**
4. Open your deployed app → **Setup tab** → paste both values → Save & connect

> **Existing install?** Run only the migration section at the bottom of `setup.sql` — each line is safe to re-run.

---

## Add to home screen

**Android (Chrome):** Three-dot menu → "Add to Home Screen"

**iPhone (Safari only):** Share button → "Add to Home Screen"

Once added, opens full screen with no browser UI.

---

## Enable notifications

Setup tab → Enable under "Notifications". Fires at **7am** and **4pm**.

Works reliably on Android. On iPhone requires iOS 16.4+ with the app added to home screen.

---

## Check-in types

### Morning check-in (automatic at 7am / before 1pm)
Cycle day, sleep score, body battery, HRV status, recovery advisory, steps yesterday, weight, mood (1–5 + note), energy (1–5 + note), work intention, body intention.

### Afternoon check-in (automatic at 4pm / after 1pm)
Mood (1–5 + note), energy (1–5 + note), focus quality, food awareness, movement, work status, notes.

### Spot check-in (any time via + button → Spot check-in)
Fast mood + energy snapshot with optional note. No AI, just data. Feeds into all averages and the trend chart. Useful for logging 3–10 times a day — more data means better pattern reads.

### Quick log (any time via + button → Quick log)
Type or voice-to-text anything. AI coach asks follow-up questions and keeps going as long as you want. Tap "Wrap it up →" to get a pattern observation and one concrete action. Full conversation is saved to your log.

---

## Insights tab

After a week or two of data:
- Average mood and energy (14-day rolling)
- Movement vs mood comparison
- Day trajectory (morning-to-afternoon mood delta)
- Work intention completion rate
- Mood and energy trend chart (14 days)
- Current cycle phase

**Pattern read** — generate any time. Claude reads your recent data and tells you what it actually sees. Pattern + notable finding + one specific action. History of all past reads is saved and accessible.

---

## Health history (Setup tab)

Upload blood tests, psychiatric assessments, GP letters as PDFs. Claude extracts medications, diagnoses, blood results (flagged and normal), and notable findings. Review what was extracted before saving. Flagged results and diagnoses are automatically included in every AI prompt so Claude can spot connections between your symptoms and your health data.

---

## About Me (Setup tab)

Free-text field injected into every Claude prompt. Update it when your situation changes — what's going on right now, recent medication changes, stress levels. The more current it is, the better the coaching.

---

## Your profile (Setup tab)

Height, starting weight, goal weight. Used by Claude to interpret weight trends in context.

---

## Updating the app

Push changes to GitHub → Netlify auto-deploys within ~60 seconds. Service worker uses network-first for `index.html` so updates load immediately on next open.

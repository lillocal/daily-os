# Daily OS

Your personal daily check-in app. Mood, energy, cycle phase, movement, and work intentions — twice a day, under two minutes.

---

## Deploy to Netlify (5 minutes)

1. Create a new GitHub repo and push all these files into it
2. Go to [netlify.com](https://netlify.com) → New site from Git → connect your repo
3. No build settings needed — just deploy
4. You'll get a URL like `your-app.netlify.app`

---

## Set up Supabase (5 minutes)

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to SQL Editor → paste the contents of `setup.sql` → Run
3. Go to Settings → API → copy your **Project URL** and **anon/public key**
4. Open the app → Setup tab → paste both in → Save & connect

---

## Add to home screen (makes it feel like a real app)

**iPhone (must use Safari):**
Tap the Share button (box with arrow) → "Add to Home Screen" → Add

**Android (Chrome):**
Tap the three-dot menu → "Add to Home Screen" → Add

---

## Enable notifications

In the app → Setup tab → "Enable" under Browser push notifications.

**Heads up:** Browser push notifications need the app/browser to have been opened recently to fire reliably. On Android it works well. On iPhone it requires iOS 16.4+ and the app added to home screen.

For more reliable delivery, set up a Make automation that sends you a WhatsApp or email with a direct link at 7am and 4pm — ask in Claude chat for a step-by-step Make scenario to do this.

---

## Check-in schedule

| Time | Type | Questions |
|------|------|-----------|
| 7am  | Morning | Cycle day, mood, energy, work intention, body intention |
| 4pm  | Afternoon | Mood, energy, food awareness, movement, work outcome, optional note |

---

## What the Insights tab shows

Once you have a week or two of data:
- Average mood and energy (14-day rolling)
- Mood + energy trend chart
- Your current cycle phase (based on cycle day entries)
- Movement impact on mood (actual numbers from your data)
- Day trajectory — your morning-to-afternoon mood delta
- Work intention completion rate

These get more accurate and interesting the more you log.

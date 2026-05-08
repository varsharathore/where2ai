# where2.ai — Setup Guide
## From zero to live in ~25 minutes

---

## Prerequisites (do these first if not done)

- Node.js 18+ → https://nodejs.org
- Git → https://git-scm.com
- GitHub account → https://github.com
- Vercel account → https://vercel.com (sign up with GitHub)
- Anthropic API key → https://console.anthropic.com

---

## Step 1 — Create your GitHub repo (2 min)

1. Go to github.com → click **New repository**
2. Name it: `where2ai`
3. Set to **Public**
4. Do NOT add README or .gitignore (we have our own)
5. Click **Create repository**
6. Copy the repo URL shown (e.g. `https://github.com/yourusername/where2ai.git`)

---

## Step 2 — Set up the project locally (5 min)

Open your terminal:

```bash
# Go to wherever you keep your projects
cd ~/Documents   # or wherever you prefer

# Create the project with Next.js
npx create-next-app@14.2.3 where2ai \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*"

cd where2ai
```

Now **replace** the generated files with the ones from this package. Copy everything from this folder into your `where2ai/` directory:

```bash
# From inside your where2ai/ directory:
# The files you need to copy/replace:
#
# components/WeekendPlanner.tsx  ← full quiz UI
# lib/types.ts                   ← TypeScript types
# lib/transformer.ts             ← JSON → UI schema
# lib/scorer.ts                  ← local scoring logic
# app/api/plans/route.ts         ← Claude API endpoint
# app/layout.tsx                 ← fonts + metadata
# app/globals.css                ← Tailwind + resets
# app/page.tsx                   ← root page
# next.config.js                 ← Next.js config
# .gitignore                     ← keeps secrets safe
# .env.local.example             ← env template
```

---

## Step 3 — Add your events data (2 min)

```bash
# Create the data directory
mkdir -p data

# Copy your events JSON file
cp /path/to/bengaluru_unified_weekend_events_may_2026.json data/events.json
```

> **Important:** The file must be at `data/events.json` inside your project.
> Your JSON must have an `events` array at the top level:
> `{ "events": [...] }` or just `[...]` — both work.

---

## Step 4 — Install dependencies (2 min)

```bash
npm install
```

This installs Next.js, Framer Motion, Lucide, and the Anthropic SDK.

---

## Step 5 — Add your API key (1 min)

```bash
# Copy the example env file
cp .env.local.example .env.local

# Open .env.local in your editor and add your key:
# ANTHROPIC_API_KEY=sk-ant-your-key-here
```

**How to get an Anthropic API key:**
1. Go to https://console.anthropic.com
2. Sign in / create account
3. Go to API Keys → Create Key
4. Copy the key (starts with `sk-ant-`)
5. Paste it into `.env.local`

> ⚠️  NEVER commit `.env.local` to GitHub. It's in `.gitignore` already.

---

## Step 6 — Run locally and test (3 min)

```bash
npm run dev
```

Open http://localhost:3000

**Test the flow:**
1. Click "Find My Plans"
2. Answer all 7 questions
3. You should see 3 results with AI-generated "why we picked this" text
4. Check your terminal — you should see `[/api/plans]` logs

**If something breaks:**
- Check that `data/events.json` exists
- Check that `.env.local` has your API key
- Check terminal for error messages

---

## Step 7 — Push to GitHub (3 min)

```bash
# Initialise git (if not already done by create-next-app)
git init

# Add everything
git add .

# First commit
git commit -m "feat: where2.ai MVP — weekend vibe planner"

# Connect to your GitHub repo (use YOUR repo URL from Step 1)
git remote add origin https://github.com/yourusername/where2ai.git

# Push
git push -u origin main
```

Go to github.com/yourusername/where2ai — you should see all files.
Verify `.env.local` is NOT there (it should only show `.env.local.example`).

---

## Step 8 — Deploy to Vercel (5 min)

### Option A — Via Vercel website (recommended for first deploy)

1. Go to https://vercel.com/new
2. Click **Import Git Repository**
3. Select `where2ai` from your GitHub repos
4. Vercel auto-detects Next.js — no config needed
5. **Before clicking Deploy:** scroll to **Environment Variables**
6. Add:
   - Key: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-your-key-here`
7. Click **Deploy**
8. Wait ~60 seconds → your site is live at `where2ai.vercel.app`

### Option B — Via CLI

```bash
npm install -g vercel

# First time — logs you in and links the project
vercel

# Follow the prompts:
# - Set up and deploy? Y
# - Which scope? (your account)
# - Link to existing project? N
# - Project name: where2ai
# - Directory: ./
# - Override settings? N

# Add the API key to Vercel
vercel env add ANTHROPIC_API_KEY
# Paste your key when prompted, select "Production, Preview, Development"

# Deploy to production
vercel --prod
```

---

## Step 9 — Every future update is one command

```bash
git add .
git commit -m "your change description"
git push
# Vercel auto-deploys on every push to main ✓
```

---

## Troubleshooting

### "Cannot find module '@/data/events.json'"
→ Make sure `data/events.json` exists in your project root

### "API key not found" / 401 error
→ Check `.env.local` has `ANTHROPIC_API_KEY=sk-ant-...`
→ On Vercel: check Environment Variables in project settings

### "Claude returned invalid JSON"
→ The local scorer fallback will kick in automatically
→ Check terminal logs for the raw Claude response

### Build fails on Vercel
→ Run `npm run build` locally first to catch errors
→ Common fix: make sure all imports use `@/` not relative paths

### Results look wrong (bad event matches)
→ Check `lib/transformer.ts` — the category mapping might need tuning for your specific events
→ Add a `console.log` in the transformer to inspect what's being produced

---

## Project structure (reference)

```
where2ai/
├── app/
│   ├── api/plans/route.ts   ← Claude API call (server-side, key is safe)
│   ├── layout.tsx           ← fonts, metadata
│   ├── page.tsx             ← renders WeekendPlanner
│   └── globals.css
├── components/
│   └── WeekendPlanner.tsx   ← full quiz UI (client component)
├── data/
│   └── events.json          ← YOUR 196 events (add this yourself)
├── lib/
│   ├── types.ts             ← shared TypeScript types
│   ├── transformer.ts       ← raw JSON → normalised event schema
│   └── scorer.ts            ← local scoring + fallback blurbs
├── .env.local               ← API key (never committed)
├── .env.local.example       ← template (committed, safe)
├── .gitignore
├── next.config.js
├── package.json
└── SETUP.md                 ← this file
```

---

## Architecture (how it works)

```
User answers 7 questions
        ↓
POST /api/plans { answers, hardNos }
        ↓
Load data/events.json
        ↓
Transform: raw JSON → normalised events (lib/transformer.ts)
        ↓
Pre-score: local scorer selects top 20 candidates (lib/scorer.ts)
        ↓
Claude API: picks best 3, writes personalised "why" blurbs
        ↓
Return: 3 ScoredEvent objects to frontend
        ↓
Display: ResultCard × 3 with match % and blurbs
```

**Why pre-score before Claude?**
Sending all 196 events to Claude every time would be slow and expensive.
The local scorer pre-filters to the 20 best matches in milliseconds,
then Claude picks the final 3 and writes the copy. Best of both worlds.

---

Good luck at the buildathon! 🚀

# CryptoCrawler — Discord Discovery Engine

A full-stack Next.js app that crawls DeFi protocol websites to extract Discord links using Puppeteer + Cheerio with stealth mode and recursive link following.

---

## Stack

- **Next.js 14** (App Router)
- **Tailwind CSS**
- **Puppeteer Extra** + Stealth Plugin
- **Cheerio** for HTML parsing
- **Supabase** for persistent storage

---

## Features

- Fetch top protocols from DefiLlama API (free, no key needed)
- Crawl protocol websites with headless Chrome (Puppeteer + stealth)
- Deep HTML extraction via Cheerio (hrefs, data attrs, scripts, text nodes)
- Recursive crawling: website → linktree → discord (depth 3)
- Twitter/X profile scanning for Discord links
- Linktree / Beacons / Campsite / Solo.to aggregator following
- Upsert results to Supabase (no duplicates)
- Dashboard with live log panel, stats, and table
- Export results as JSON

---

## Setup

### 1. Install dependencies

```bash
cd crypto-crawler
npm install
```

### 2. Environment variables

Create `.env.local` (already done — credentials pre-filled):

```env
NEXT_PUBLIC_SUPABASE_URL=https://rmpyubjiuzqrmdnwemum.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Set up Supabase table

1. Go to [supabase.com](https://supabase.com) → your project
2. Open **SQL Editor**
3. Paste and run the contents of `supabase-schema.sql`

This creates the `protocols` table with the correct schema.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Usage

### Single Protocol Crawl
- Type a protocol name (e.g. "Aave") in the input
- Click **Crawl**
- Watch the live log panel
- Results appear in the table

### Batch Crawl (Top Protocols)
- Select how many protocols (5–20) from the dropdown
- Click **Fetch & Crawl Top**
- App fetches from DefiLlama, then crawls each one sequentially
- All results saved to Supabase automatically

### View Saved Results
- Click the **Saved in DB** tab
- All past crawls from Supabase are listed
- Use the filter input to search by name

---

## Project Structure

```
crypto-crawler/
├── app/
│   ├── api/
│   │   ├── crawl/route.ts        ← POST: crawl single, GET: batch
│   │   ├── protocols/route.ts    ← GET: fetch from DefiLlama
│   │   └── results/route.ts      ← GET: fetch from Supabase
│   ├── components/
│   │   ├── CopyButton.tsx
│   │   ├── LogPanel.tsx
│   │   ├── ProtocolTable.tsx
│   │   ├── StatsBar.tsx
│   │   └── StatusBadge.tsx
│   ├── lib/
│   │   ├── defillama.ts          ← DefiLlama API helpers
│   │   └── supabase.ts           ← Supabase client + upsert logic
│   ├── page.tsx                  ← Main dashboard
│   ├── layout.tsx
│   └── globals.css
├── scraper/
│   ├── extractors/
│   │   └── discord.ts            ← Discord/Linktree extraction logic
│   ├── utils/
│   │   ├── browser.ts            ← Puppeteer browser manager
│   │   └── crawler.ts            ← Recursive link crawler
│   └── index.ts                  ← Main scraper orchestrator
├── supabase-schema.sql
├── next.config.js
├── tailwind.config.js
└── .env.local
```

---

## Crawl Flow

```
Input: Protocol Name
  ↓
1. Look up in DefiLlama API → get website URL + Twitter handle
  ↓
2. Visit website with Puppeteer (stealth mode)
   → Parse HTML with Cheerio
   → Search: hrefs, data attrs, scripts, raw text
   → Extract discord.gg / discord.com/invite links
   → If not found: follow linktree/beacons/campsite links recursively (depth 3)
  ↓
3. If still not found: visit Twitter/X profile
   → Search bio, links, page content
   → Follow any aggregator links found
  ↓
4. Return structured result:
   { protocol, website, twitter, discord, status }
  ↓
5. Upsert to Supabase (by name, no duplicates)
```

---

## Output Format

```json
{
  "protocol": "Aave",
  "website": "https://aave.com",
  "twitter": "https://x.com/aavegotchi",
  "discord": "https://discord.gg/CvKUrHM",
  "status": "FOUND"
}
```

```json
{
  "protocol": "Example",
  "website": "404",
  "twitter": "https://x.com/example",
  "discord": "404",
  "status": "NOT_FOUND"
}
```

---

## Notes

- **No paid APIs used** — only DefiLlama (free), Puppeteer (local), Cheerio (local)
- **No proxies, Docker, Redis, or auth** needed
- Puppeteer uses stealth plugin to bypass basic bot detection
- Images/fonts/media blocked in browser to speed up crawling
- Browser instance is reused across crawls for efficiency
- Supabase upsert uses `name` as the unique conflict key

---

## Troubleshooting

**Puppeteer won't launch on Linux/Ubuntu:**
```bash
sudo apt-get install -y libatk-bridge2.0-0 libdrm2 libxkbcommon0 libgbm1
```

**Chromium not found:**
```bash
npx puppeteer browsers install chrome
```

**Supabase 401 error:**
- Make sure you ran `supabase-schema.sql` in the SQL Editor
- Check `.env.local` has the correct anon key

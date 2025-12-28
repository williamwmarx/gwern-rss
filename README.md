# gwern-rss

RSS feed for [gwern.net/changelog](https://gwern.net/changelog), updated every 15 minutes.

**Feed URL:** https://gwern-rss.marx.sh/feed.xml

## How it works

Cloudflare Worker that scrapes the changelog page, detects new entries, and publishes them as RSS items. Uses KV storage for deduplication.

## Setup

```bash
npm install
npm run dev      # local development
npm run deploy   # deploy to Cloudflare
```

Requires a Cloudflare account with KV namespace configured in `wrangler.toml`.

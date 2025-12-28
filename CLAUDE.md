# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start local dev server with KV emulation
npm run deploy    # Deploy to Cloudflare Workers
npm run typecheck # Run TypeScript type checking
```

## Architecture

Cloudflare Worker that scrapes gwern.net/changelog every 15 minutes and publishes new entries as an RSS feed.

**Data flow:**
1. Cron trigger → `scheduled()` in index.ts
2. Fetch & parse changelog HTML → parser.ts extracts entries from `<h2>Month Year</h2>` + `<ul><li>` structure
3. Diff against known entries in KV → diff.ts handles deduplication
4. Generate RSS XML → rss.ts builds RSS 2.0 feed
5. Store state in KV (known_entries, feed_items)

**KV storage:**
- `known_entries`: JSON array of entry IDs for deduplication (capped at 1000)
- `feed_items`: JSON array of RSS items (capped at 100)

**Entry ID format:** `{month}-{year}:{href}` (e.g., `november-2025:/fiction/story`)

**First run behavior:** Seeds all entries as "known", adds most recent month to feed.

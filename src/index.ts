import * as Sentry from "@sentry/cloudflare";
import type { Env, FeedItem } from "./types";
import { fetchChangelog, filterToMonth, getMostRecentMonthId } from "./parser";
import {
  getKnownEntryIds,
  getFeedItems,
  findNewEntries,
  entriesToFeedItems,
  saveState,
  isFirstRun,
} from "./diff";
import { generateRss } from "./rss";

export default Sentry.withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    sendDefaultPii: false,
  }),
  {
    async scheduled(
      _controller: ScheduledController,
      env: Env,
      ctx: ExecutionContext
    ): Promise<void> {
      ctx.waitUntil(updateFeed(env));
    },

    async fetch(
      request: Request,
      env: Env,
      _ctx: ExecutionContext
    ): Promise<Response> {
      const url = new URL(request.url);

      if (url.pathname === "/" || url.pathname === "/feed.xml") {
        const feedItems = await getFeedItems(env.KV);
        const rss = generateRss(feedItems);
        return new Response(rss, {
          headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "public, max-age=300",
          },
        });
      }

      return new Response("Not found", { status: 404 });
    },
  } satisfies ExportedHandler<Env>
);

async function updateFeed(env: Env): Promise<void> {
  const entries = await fetchChangelog();
  const knownIds = await getKnownEntryIds(env.KV);
  const existingFeed = await getFeedItems(env.KV);

  let newItems: FeedItem[];
  let allIds: string[];

  if (isFirstRun(knownIds)) {
    // First run: seed all entries as "known", add most recent month to feed
    allIds = entries.map((e) => e.id);
    const currentMonth = getMostRecentMonthId(entries);
    if (currentMonth) {
      const recentEntries = filterToMonth(entries, currentMonth);
      newItems = entriesToFeedItems(recentEntries);
      console.log(`First run: seeded ${allIds.length} entries, added ${recentEntries.length} from ${currentMonth} to feed`);
    } else {
      newItems = [];
    }
  } else {
    // Normal run: find new entries and add to feed
    const newEntries = findNewEntries(entries, knownIds);
    newItems = entriesToFeedItems(newEntries);
    allIds = [...knownIds, ...newEntries.map((e) => e.id)];

    if (newEntries.length > 0) {
      console.log(`Found ${newEntries.length} new entries`);
    }
  }

  // Prepend new items to existing feed
  const updatedFeed = [...newItems, ...existingFeed];
  await saveState(env.KV, allIds, updatedFeed);
}

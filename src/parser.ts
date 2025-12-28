import { parseHTML } from "linkedom";
import type { Entry } from "./types";

const CHANGELOG_URL = "https://gwern.net/changelog";

export async function fetchChangelog(): Promise<Entry[]> {
  try {
    const res = await fetch(CHANGELOG_URL);
    if (!res.ok) {
      console.error(`Fetch failed: ${res.status}`);
      return [];
    }
    const html = await res.text();
    return parseChangelog(html);
  } catch (err) {
    console.error(`Fetch error: ${err}`);
    return [];
  }
}

export function parseChangelog(html: string): Entry[] {
  const { document } = parseHTML(html);
  const entries: Entry[] = [];

  // Find all month headings (h2 elements like "November 2025")
  const monthHeadings = document.querySelectorAll("h2");

  for (const h2 of monthHeadings) {
    const text = h2.textContent?.trim() || "";
    // Parse month-year from text (e.g., "November 2025")
    const match = text.match(/^([A-Za-z]+)\s+(\d{4})$/);
    if (!match) continue;

    const [, monthName, year] = match;
    const monthId = `${monthName.toLowerCase()}-${year}`;
    const pubDate = parseMonthYear(monthName, year);

    // Find the next sibling ul
    let sibling = h2.nextElementSibling;
    while (sibling && sibling.tagName !== "UL" && sibling.tagName !== "H1" && sibling.tagName !== "H2") {
      sibling = sibling.nextElementSibling;
    }

    if (!sibling || sibling.tagName !== "UL") continue;

    // Process each li in the ul
    const listItems = sibling.querySelectorAll(":scope > li");
    for (const li of listItems) {
      const entry = parseListItem(li, monthId, pubDate);
      if (entry) entries.push(entry);
    }
  }

  return entries;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseListItem(li: any, monthId: string, pubDate: Date): Entry | null {
  const firstLink = li.querySelector("a");
  if (!firstLink) return null;

  const href = firstLink.getAttribute("href") || "";
  const title = firstLink.textContent?.trim() || "";
  if (!href || !title) return null;

  // Build full link
  const link = href.startsWith("http") ? href : `https://gwern.net${href}`;

  // Get description from li content (truncated)
  const description = li.textContent?.trim().slice(0, 500) || "";

  // Generate stable ID from month + href
  const id = `${monthId}:${href}`;

  return { id, title, link, description, pubDate };
}

function parseMonthYear(monthName: string, year: string): Date {
  const months: Record<string, number> = {
    january: 0, february: 1, march: 2, april: 3,
    may: 4, june: 5, july: 6, august: 7,
    september: 8, october: 9, november: 10, december: 11,
  };
  const monthNum = months[monthName.toLowerCase()] ?? 0;
  return new Date(parseInt(year), monthNum, 1);
}

export function getMostRecentMonthId(entries: Entry[]): string | null {
  if (entries.length === 0) return null;
  return entries[0].id.split(":")[0];
}

export function filterToMonth(entries: Entry[], monthId: string): Entry[] {
  return entries.filter((e) => e.id.startsWith(monthId + ":"));
}

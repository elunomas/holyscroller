import { db } from "@/db";
import { fetchChapter } from "@/lib/bible-api";
import { BIBLE_BOOKS } from "@/lib/books";
import type { Verse, CachedChapter, BookInfo, VerseHistory } from "@/types";

/**
 * Get verses for a specific chapter, fetching from API if not cached.
 * This is the core lazy-loading mechanism.
 */
export async function getChapterVerses(
  bookAbbr: string,
  chapter: number
): Promise<Verse[]> {
  const cacheKey = `${bookAbbr}:${chapter}`;

  // Check if already cached
  const cached = await db.cachedChapters.get(cacheKey);
  if (cached) {
    return db.verses
      .where("[book+chapter]")
      .equals([cached.bookName, chapter])
      .toArray();
  }

  // Fetch from API
  const verses = await fetchChapter(bookAbbr, chapter);
  if (!verses || verses.length === 0) return [];

  const book = BIBLE_BOOKS.find((b) => b.abbr === bookAbbr);
  if (!book) return [];

  // Store in cache — use a transaction for atomicity
  await db.transaction("rw", [db.verses, db.cachedChapters], async () => {
    await db.verses.bulkPut(verses);
    const chapterMeta: CachedChapter = {
      id: cacheKey,
      bookId: bookAbbr,
      bookName: book.name,
      chapter,
      cachedAt: new Date(),
      verseCount: verses.length,
    };
    await db.cachedChapters.put(chapterMeta);
  });

  return verses;
}

/**
 * Prefetch multiple random chapters in parallel.
 * Picks N uncached chapters from different books for variety,
 * fetches them concurrently using Promise.allSettled for resilience.
 *
 * @param count - Number of chapters to prefetch (default 5)
 * @returns Number of chapters successfully fetched
 */
export async function prefetchMultipleChapters(
  count: number = 5
): Promise<number> {
  const cachedChapterIds = new Set(
    (await db.cachedChapters.toArray()).map((c) => c.id)
  );

  // Build list of uncached chapters
  const uncached: { book: BookInfo; chapter: number }[] = [];
  for (const book of BIBLE_BOOKS) {
    for (let ch = 1; ch <= book.chapters; ch++) {
      const key = `${book.abbr}:${ch}`;
      if (!cachedChapterIds.has(key)) {
        uncached.push({ book, chapter: ch });
      }
    }
  }

  if (uncached.length === 0) return 0;

  // Pick chapters from different books for variety.
  // Group by book, then round-robin pick one chapter per book.
  const byBook = new Map<string, { book: BookInfo; chapter: number }[]>();
  for (const entry of uncached) {
    const existing = byBook.get(entry.book.abbr) ?? [];
    existing.push(entry);
    byBook.set(entry.book.abbr, existing);
  }

  const bookKeys = [...byBook.keys()];
  // Shuffle the book keys to get random books
  for (let i = bookKeys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bookKeys[i], bookKeys[j]] = [bookKeys[j], bookKeys[i]];
  }

  const picks: { book: BookInfo; chapter: number }[] = [];
  for (const bookKey of bookKeys) {
    if (picks.length >= count) break;
    const chapters = byBook.get(bookKey)!;
    // Pick a random chapter from this book
    const pick = chapters[Math.floor(Math.random() * chapters.length)];
    picks.push(pick);
  }

  // If we still need more (fewer books than count), pick from remaining uncached
  if (picks.length < count) {
    const pickedKeys = new Set(picks.map((p) => `${p.book.abbr}:${p.chapter}`));
    const remaining = uncached.filter(
      (u) => !pickedKeys.has(`${u.book.abbr}:${u.chapter}`)
    );
    // Shuffle remaining
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }
    for (const r of remaining) {
      if (picks.length >= count) break;
      picks.push(r);
    }
  }

  // Fetch all picked chapters in parallel
  const results = await Promise.allSettled(
    picks.map((pick) => getChapterVerses(pick.book.abbr, pick.chapter))
  );

  let successCount = 0;
  for (const result of results) {
    if (result.status === "fulfilled" && result.value.length > 0) {
      successCount++;
    }
  }

  return successCount;
}

/**
 * Get random verses with recency de-boosting.
 * Fetches new chapters on demand if the cache is insufficient.
 *
 * @param count - Number of verses to return
 * @param excludeVerseIds - Verse IDs to exclude (already in feed)
 * @param recencyMap - Map of verseId → VerseHistory for weighted selection
 */
export async function getRandomVerses(
  count: number,
  excludeVerseIds: Set<string> = new Set(),
  recencyMap: Map<string, VerseHistory> = new Map()
): Promise<Verse[]> {
  // First, try to get enough verses from the cache
  const allCached = await db.verses.toArray();
  const available = allCached.filter((v) => !excludeVerseIds.has(v.id));

  if (available.length >= count) {
    return weightedRandomSample(available, count, recencyMap);
  }

  // Not enough cached — fetch a random chapter
  const newVerses = await fetchRandomChapter();
  if (newVerses.length > 0) {
    const combined = [
      ...available,
      ...newVerses.filter((v) => !excludeVerseIds.has(v.id)),
    ];
    return weightedRandomSample(
      combined,
      Math.min(count, combined.length),
      recencyMap
    );
  }

  // Fallback: return whatever we have
  return weightedRandomSample(
    available,
    Math.min(count, available.length),
    recencyMap
  );
}

/**
 * Fetch a random chapter that hasn't been cached yet.
 * If all chapters are cached, returns empty (caller uses cache).
 */
async function fetchRandomChapter(): Promise<Verse[]> {
  const cachedChapterIds = new Set(
    (await db.cachedChapters.toArray()).map((c) => c.id)
  );

  // Build list of uncached chapters
  const uncached: { book: BookInfo; chapter: number }[] = [];
  for (const book of BIBLE_BOOKS) {
    for (let ch = 1; ch <= book.chapters; ch++) {
      const key = `${book.abbr}:${ch}`;
      if (!cachedChapterIds.has(key)) {
        uncached.push({ book, chapter: ch });
      }
    }
  }

  if (uncached.length === 0) {
    return [];
  }

  const pick = uncached[Math.floor(Math.random() * uncached.length)];
  return getChapterVerses(pick.book.abbr, pick.chapter);
}

/**
 * Get the number of cached chapters and total available chapters.
 */
export async function getCacheStats(): Promise<{
  cachedChapters: number;
  totalChapters: number;
  cachedVerses: number;
}> {
  const [cachedChapters, cachedVerses] = await Promise.all([
    db.cachedChapters.count(),
    db.verses.count(),
  ]);
  const totalChapters = BIBLE_BOOKS.reduce((s, b) => s + b.chapters, 0);
  return { cachedChapters, totalChapters, cachedVerses };
}

/**
 * Compute a weight for a verse based on its view history.
 * Never-seen verses get weight 1.0 (highest).
 * Seen verses are down-weighted based on seenCount and time since last seen.
 *
 * Formula: weight = 1 / (1 + seenCount) * decayFactor
 * where decayFactor = min(1, hoursSinceLastSeen / 168)
 *   (168 hours = 1 week; fully recovers weight after a week)
 */
function computeWeight(history: VerseHistory | undefined): number {
  if (!history) return 1.0;

  const now = Date.now();
  const hoursSinceLastSeen =
    (now - history.lastSeenAt.getTime()) / (1000 * 60 * 60);
  const decayFactor = Math.min(1, hoursSinceLastSeen / 168);
  return (1 / (1 + history.seenCount)) * Math.max(0.01, decayFactor);
}

/**
 * Weighted random sample: pick `n` items from array using recency-based weights.
 * Verses seen recently get lower weight; never-seen verses get highest weight.
 * Falls back to uniform sampling when no recency data is available.
 */
function weightedRandomSample(
  arr: Verse[],
  n: number,
  recencyMap: Map<string, VerseHistory>
): Verse[] {
  if (n <= 0 || arr.length === 0) return [];
  if (n >= arr.length) return fisherYatesShuffle([...arr]);

  // If no recency data, use simple Fisher-Yates for efficiency
  if (recencyMap.size === 0) {
    return fisherYatesSample(arr, n);
  }

  // Build weighted index
  const indices = arr.map((v, i) => ({
    index: i,
    weight: computeWeight(recencyMap.get(v.id)),
  }));

  const result: Verse[] = [];
  const used = new Set<number>();

  for (let picked = 0; picked < n; picked++) {
    // Compute total weight of remaining items
    let totalWeight = 0;
    for (const item of indices) {
      if (!used.has(item.index)) {
        totalWeight += item.weight;
      }
    }

    // Pick a random value in [0, totalWeight)
    let r = Math.random() * totalWeight;
    let chosen = -1;

    for (const item of indices) {
      if (used.has(item.index)) continue;
      r -= item.weight;
      if (r <= 0) {
        chosen = item.index;
        break;
      }
    }

    // Edge case: floating point issues — pick last available
    if (chosen === -1) {
      for (let i = indices.length - 1; i >= 0; i--) {
        if (!used.has(indices[i].index)) {
          chosen = indices[i].index;
          break;
        }
      }
    }

    if (chosen >= 0) {
      used.add(chosen);
      result.push(arr[chosen]);
    }
  }

  return result;
}

/** Fisher-Yates sample: pick `n` random items from array without mutation */
function fisherYatesSample<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const result: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy[idx]);
    copy[idx] = copy[copy.length - 1];
    copy.pop();
  }
  return result;
}

/** Fisher-Yates shuffle: return a new shuffled copy of the array */
function fisherYatesShuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

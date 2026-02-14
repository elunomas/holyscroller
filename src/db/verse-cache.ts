import { db } from "@/db";
import { fetchChapter } from "@/lib/bible-api";
import { BIBLE_BOOKS } from "@/lib/books";
import type { Verse, CachedChapter, BookInfo } from "@/types";

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
 * Get random verses, fetching new chapters on demand if needed.
 * Prefers cached verses first, falls back to fetching a random chapter.
 *
 * @param count - Number of verses to return
 * @param excludeVerseIds - Verse IDs to exclude (already shown)
 */
export async function getRandomVerses(
  count: number,
  excludeVerseIds: Set<string> = new Set()
): Promise<Verse[]> {
  // First, try to get enough verses from the cache
  const allCached = await db.verses.toArray();
  const available = allCached.filter((v) => !excludeVerseIds.has(v.id));

  if (available.length >= count) {
    // Shuffle and pick from cache
    return fisherYatesSample(available, count);
  }

  // Not enough cached — fetch a random chapter
  const newVerses = await fetchRandomChapter();
  if (newVerses.length > 0) {
    const combined = [
      ...available,
      ...newVerses.filter((v) => !excludeVerseIds.has(v.id)),
    ];
    return fisherYatesSample(combined, Math.min(count, combined.length));
  }

  // Fallback: return whatever we have
  return fisherYatesSample(available, Math.min(count, available.length));
}

/**
 * Fetch a random chapter that hasn't been cached yet.
 * If all chapters are cached, pick a random cached one.
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
    // Everything's cached — return empty (caller uses cache)
    return [];
  }

  // Pick a random uncached chapter
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

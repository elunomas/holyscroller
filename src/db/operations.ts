import { db } from "@/db";
import { getRandomVerses, prefetchMultipleChapters } from "@/db/verse-cache";
import { generateId, startOfToday } from "@/lib/utils";
import type { FeedItem, Verse, VerseHistory } from "@/types";

const BATCH_SIZE = 10;
const PREFETCH_CHAPTER_COUNT = 5;

/**
 * Generate a new batch of feed items.
 * 1. Prefetch multiple chapters on first load (cache is empty/small).
 * 2. Check for liked items from yesterday that should resurface.
 * 3. Pick random verses using weighted selection (recency de-boosted).
 * 4. Create feed items, record verse history, and store them.
 */
export async function generateFeedBatch(): Promise<
  Array<FeedItem & { verse: Verse }>
> {
  const today = startOfToday();
  const results: Array<FeedItem & { verse: Verse }> = [];

  // 0. Prefetch multiple chapters if cache is empty or small
  const cachedCount = await db.cachedChapters.count();
  if (cachedCount < PREFETCH_CHAPTER_COUNT) {
    await prefetchMultipleChapters(PREFETCH_CHAPTER_COUNT);
  }

  // 1. Resurface liked items from previous days
  const likedItems = await db.feedItems
    .filter((item) => item.liked === true)
    .toArray();

  const toResurface = likedItems.filter(
    (item) => item.likedAt && item.likedAt < today
  );

  for (const item of toResurface) {
    // Reset old item's liked status
    await db.feedItems.update(item.id, {
      liked: false,
      likedAt: undefined,
    });

    // Create a new feed item for the same verse
    const verse = await db.verses.get(item.verseId);
    if (!verse) continue;

    const newItem: FeedItem = {
      id: generateId(),
      verseId: item.verseId,
      liked: false,
      hidden: false,
      shownAt: new Date(),
      order: Math.random(),
    };
    await db.feedItems.add(newItem);
    results.push({ ...newItem, verse });
  }

  // 2. How many more do we need?
  const remaining = BATCH_SIZE - results.length;
  if (remaining <= 0) return results;

  // Get IDs of verses already in the feed (to avoid duplicates)
  const existingVerseIds = new Set(
    (await db.feedItems.toArray()).map((fi) => fi.verseId)
  );

  // Build recency map from verseHistory table
  const historyRecords = await db.verseHistory.toArray();
  const recencyMap = new Map<string, VerseHistory>();
  for (const record of historyRecords) {
    recencyMap.set(record.verseId, record);
  }

  // Get random verses with recency de-boosting
  const randomVerses = await getRandomVerses(
    remaining,
    existingVerseIds,
    recencyMap
  );

  // 3. Create feed items and record history
  const now = new Date();
  for (const verse of randomVerses) {
    const feedItem: FeedItem = {
      id: generateId(),
      verseId: verse.id,
      liked: false,
      hidden: false,
      shownAt: now,
      order: Math.random(),
    };
    await db.feedItems.add(feedItem);
    results.push({ ...feedItem, verse });

    // Record in verseHistory for future recency de-boosting
    const existing = recencyMap.get(verse.id);
    await db.verseHistory.put({
      verseId: verse.id,
      lastSeenAt: now,
      seenCount: existing ? existing.seenCount + 1 : 1,
    });
  }

  return results;
}

/** Toggle like on a feed item */
export async function toggleLike(feedItemId: string): Promise<void> {
  const item = await db.feedItems.get(feedItemId);
  if (!item) return;

  await db.feedItems.update(feedItemId, {
    liked: !item.liked,
    likedAt: !item.liked ? new Date() : undefined,
  });
}

/** Hide a feed item */
export async function hideFeedItem(feedItemId: string): Promise<void> {
  await db.feedItems.update(feedItemId, { hidden: true });
}

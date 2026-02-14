import { db } from "@/db";
import { getRandomVerses } from "@/db/verse-cache";
import { generateId, startOfToday } from "@/lib/utils";
import type { FeedItem, Verse } from "@/types";

const BATCH_SIZE = 10;

/**
 * Generate a new batch of feed items.
 * 1. First, check for liked items from yesterday that should resurface.
 * 2. Then pick random verses (fetching new chapters if needed).
 * 3. Create feed items and store them.
 */
export async function generateFeedBatch(): Promise<
  Array<FeedItem & { verse: Verse }>
> {
  const today = startOfToday();
  const results: Array<FeedItem & { verse: Verse }> = [];

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
      order: Date.now() + Math.random(),
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

  // Get random verses (this may fetch new chapters from the API)
  const randomVerses = await getRandomVerses(remaining, existingVerseIds);

  // 3. Create feed items
  for (const verse of randomVerses) {
    const feedItem: FeedItem = {
      id: generateId(),
      verseId: verse.id,
      liked: false,
      hidden: false,
      shownAt: new Date(),
      order: Date.now() + Math.random(),
    };
    await db.feedItems.add(feedItem);
    results.push({ ...feedItem, verse });
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

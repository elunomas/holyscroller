import Dexie, { type EntityTable } from "dexie";
import type { Verse, FeedItem, Comment, CachedChapter } from "@/types";

/**
 * Daily Bread database — Dexie wrapper around IndexedDB.
 *
 * Tables:
 * - verses: Cached Bible verses (populated lazily from bible-api.com)
 * - feedItems: The materialized social-media-style feed
 * - comments: Threaded comments on feed items
 * - cachedChapters: Tracks which chapters have been fetched
 */
class DailyBreadDB extends Dexie {
  verses!: EntityTable<Verse, "id">;
  feedItems!: EntityTable<FeedItem, "id">;
  comments!: EntityTable<Comment, "id">;
  cachedChapters!: EntityTable<CachedChapter, "id">;

  constructor() {
    super("daily-bread");

    this.version(1).stores({
      // Verses: indexed by id, book, chapter, bookIndex for random selection
      verses: "id, book, chapter, bookIndex, [book+chapter]",
      // Feed items: indexed by id, verseId, order; filtered by liked/hidden
      feedItems: "id, verseId, order, liked, hidden, shownAt",
      // Comments: indexed by id, feedItemId, parentId
      comments: "id, feedItemId, parentId, createdAt",
      // Cache tracking: which chapters we've already fetched
      cachedChapters: "id, bookId, chapter",
    });
  }
}

/** Singleton database instance */
export const db = new DailyBreadDB();

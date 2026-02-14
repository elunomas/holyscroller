/** Core domain types for Daily Bread */

/** A single Bible verse, cached from bible-api.com */
export interface Verse {
  /** Composite key: "GEN:1:1" */
  id: string;
  /** Full book name: "Genesis" */
  book: string;
  /** Book index 0-65 for ordering */
  bookIndex: number;
  /** Chapter number */
  chapter: number;
  /** Verse number */
  verse: number;
  /** The verse text */
  text: string;
  /** Human-readable: "Genesis 1:1" */
  reference: string;
}

/** A materialized feed item — a verse "post" in the scroll */
export interface FeedItem {
  /** UUID */
  id: string;
  /** Reference to verse ID */
  verseId: string;
  /** Is this post liked? */
  liked: boolean;
  /** When was it liked (for next-day resurfacing) */
  likedAt?: Date;
  /** Is this post hidden by user? */
  hidden: boolean;
  /** When this item was generated */
  shownAt: Date;
  /** Sort order in feed */
  order: number;
}

/** A threaded comment on a feed item */
export interface Comment {
  /** UUID */
  id: string;
  /** Which feed item */
  feedItemId: string;
  /** null = top-level, string = reply to another comment */
  parentId: string | null;
  /** Comment text */
  text: string;
  /** When created */
  createdAt: Date;
  /** When last edited */
  updatedAt: Date;
}

/** Metadata about which chapters we've cached */
export interface CachedChapter {
  /** Composite key: "GEN:1" */
  id: string;
  /** Book abbreviation */
  bookId: string;
  /** Book full name */
  bookName: string;
  /** Chapter number */
  chapter: number;
  /** When this chapter was cached */
  cachedAt: Date;
  /** Number of verses in this chapter */
  verseCount: number;
}

/** Book info for random selection */
export interface BookInfo {
  /** 3-letter abbreviation used by bible-api.com */
  abbr: string;
  /** Full name */
  name: string;
  /** Total chapters in this book */
  chapters: number;
  /** Book index 0-65 */
  index: number;
}

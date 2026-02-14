"use client";

import { useState, useCallback, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import { generateFeedBatch, toggleLike, hideFeedItem } from "@/db/operations";
import type { FeedItem, Verse } from "@/types";

export interface FeedEntry {
  feedItem: FeedItem;
  verse: Verse;
}

interface UseFeedReturn {
  entries: FeedEntry[];
  loading: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  onLike: (feedItemId: string) => Promise<void>;
  onHide: (feedItemId: string) => Promise<void>;
  hasMore: boolean;
}

/**
 * useFeed — manages the infinite scroll feed.
 * Uses Dexie live queries for reactivity + generates new batches on demand.
 */
export function useFeed(): UseFeedReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const initialLoadDone = useRef(false);

  // Live query: all non-hidden feed items, ordered by `order`
  const feedItems = useLiveQuery(
    () =>
      db.feedItems
        .filter((item) => item.hidden === false)
        .sortBy("order"),
    []
  );

  // Live query: all verses (for joining)
  const verses = useLiveQuery(() => db.verses.toArray(), []);

  // Build a lookup map
  const verseMap = new Map<string, Verse>();
  if (verses) {
    for (const v of verses) {
      verseMap.set(v.id, v);
    }
  }

  // Join feed items with their verses
  const entries: FeedEntry[] = (feedItems ?? [])
    .map((fi) => {
      const verse = verseMap.get(fi.verseId);
      if (!verse) return null;
      return { feedItem: fi, verse };
    })
    .filter((e): e is FeedEntry => e !== null);

  // Load initial batch if empty
  const loadMore = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const batch = await generateFeedBatch();
      if (batch.length === 0) {
        setHasMore(false);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load verses"
      );
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // Auto-load first batch
  if (!initialLoadDone.current && feedItems !== undefined && entries.length === 0 && !loading) {
    initialLoadDone.current = true;
    loadMore();
  }

  const onLike = useCallback(async (feedItemId: string) => {
    await toggleLike(feedItemId);
  }, []);

  const onHide = useCallback(async (feedItemId: string) => {
    await hideFeedItem(feedItemId);
  }, []);

  return {
    entries,
    loading,
    error,
    loadMore,
    onLike,
    onHide,
    hasMore,
  };
}

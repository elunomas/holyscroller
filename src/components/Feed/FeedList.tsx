"use client";

import { useFeed } from "@/hooks/useFeed";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { PostCard } from "@/components/Post/PostCard";

export function FeedList() {
  const { entries, loading, error, loadMore, onLike, onHide, hasMore } =
    useFeed();

  const sentinelRef = useInfiniteScroll(loadMore, {
    enabled: hasMore && !loading,
  });

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {entries.map((entry) => (
        <PostCard
          key={entry.feedItem.id}
          feedItem={entry.feedItem}
          verse={entry.verse}
          onLike={onLike}
          onHide={onHide}
        />
      ))}

      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-pulse text-stone-400 text-sm">
            Loading verses...
          </div>
        </div>
      )}

      {error && (
        <div className="text-center py-8">
          <p className="text-red-600 text-sm mb-2">{error}</p>
          <button
            onClick={loadMore}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Try again
          </button>
        </div>
      )}

      {!hasMore && entries.length > 0 && (
        <p className="text-center text-stone-400 text-sm py-8">
          You&apos;ve seen all available verses. More will load as new chapters
          are fetched.
        </p>
      )}

      {/* Invisible sentinel for infinite scroll */}
      <div ref={sentinelRef} className="h-1" />
    </div>
  );
}

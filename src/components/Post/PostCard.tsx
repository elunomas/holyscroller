"use client";

import { useState } from "react";
import type { FeedItem, Verse } from "@/types";
import { CommentSection } from "@/components/Comments/CommentSection";

interface PostCardProps {
  feedItem: FeedItem;
  verse: Verse;
  onLike: (id: string) => Promise<void>;
  onHide: (id: string) => Promise<void>;
}

export function PostCard({ feedItem, verse, onLike, onHide }: PostCardProps) {
  const [showComments, setShowComments] = useState(false);

  return (
    <article className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
      {/* Book badge */}
      <div className="px-5 pt-4 pb-2 flex items-center gap-2">
        <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">
          {verse.book}
        </span>
      </div>

      {/* Verse text */}
      <div className="px-5 pb-3">
        <p className="text-lg leading-relaxed text-stone-800 font-serif">
          &ldquo;{verse.text}&rdquo;
        </p>
        <p className="mt-2 text-sm font-medium text-amber-700">
          — {verse.reference}
        </p>
      </div>

      {/* Action bar */}
      <div className="px-5 py-3 border-t border-stone-100 flex items-center gap-1">
        <button
          onClick={() => onLike(feedItem.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
            feedItem.liked
              ? "bg-red-50 text-red-600"
              : "text-stone-500 hover:bg-stone-100"
          }`}
          aria-label={feedItem.liked ? "Unlike" : "Like"}
        >
          <span>{feedItem.liked ? "❤️" : "🤍"}</span>
          <span>{feedItem.liked ? "Liked" : "Like"}</span>
        </button>

        <button
          onClick={() => setShowComments((s) => !s)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-stone-500 hover:bg-stone-100 transition-colors"
          aria-label="Comments"
        >
          <span>💬</span>
          <span>Comment</span>
        </button>

        <button
          onClick={() => onHide(feedItem.id)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
          aria-label="Hide"
        >
          <span>✕</span>
        </button>
      </div>

      {/* Comments section (expandable) */}
      {showComments && (
        <div className="border-t border-stone-100">
          <CommentSection feedItemId={feedItem.id} />
        </div>
      )}
    </article>
  );
}

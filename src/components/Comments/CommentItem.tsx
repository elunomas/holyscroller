"use client";

import { useState } from "react";
import type { Comment } from "@/types";
import { CommentForm } from "./CommentForm";

const MAX_DEPTH = 3;

interface CommentItemProps {
  comment: Comment;
  allComments: Comment[];
  onReply: (text: string, parentId: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  depth: number;
}

export function CommentItem({
  comment,
  allComments,
  onReply,
  onDelete,
  depth,
}: CommentItemProps) {
  const [showReply, setShowReply] = useState(false);
  const children = allComments.filter((c) => c.parentId === comment.id);

  const timeAgo = getTimeAgo(comment.createdAt);

  return (
    <div className={depth > 0 ? "ml-4 pl-3 border-l-2 border-stone-200" : ""}>
      <div className="group">
        <p className="text-sm text-stone-700">{comment.text}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-stone-400">{timeAgo}</span>
          {depth < MAX_DEPTH && (
            <button
              onClick={() => setShowReply((s) => !s)}
              className="text-xs text-stone-400 hover:text-amber-600 transition-colors"
            >
              Reply
            </button>
          )}
          <button
            onClick={() => onDelete(comment.id)}
            className="text-xs text-stone-300 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
          >
            Delete
          </button>
        </div>
      </div>

      {showReply && (
        <div className="mt-2">
          <CommentForm
            onSubmit={async (text) => {
              await onReply(text, comment.id);
              setShowReply(false);
            }}
            autoFocus
          />
        </div>
      )}

      {children.length > 0 && (
        <div className="mt-2 space-y-2">
          {children.map((child) => (
            <CommentItem
              key={child.id}
              comment={child}
              allComments={allComments}
              onReply={onReply}
              onDelete={onDelete}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

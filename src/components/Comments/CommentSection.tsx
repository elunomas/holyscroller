"use client";

import { useComments } from "@/hooks/useComments";
import { CommentForm } from "./CommentForm";
import { CommentItem } from "./CommentItem";
import type { Comment } from "@/types";

interface CommentSectionProps {
  feedItemId: string;
}

export function CommentSection({ feedItemId }: CommentSectionProps) {
  const { comments, addComment, deleteComment } = useComments(feedItemId);

  // Build comment tree
  const topLevel = comments.filter((c) => c.parentId === null);

  return (
    <div className="px-5 py-4 space-y-3">
      <CommentForm
        onSubmit={(text) => addComment(text)}
        placeholder="Add a reflection..."
      />

      {topLevel.length > 0 && (
        <div className="space-y-3 mt-3">
          {topLevel.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              allComments={comments}
              onReply={(text, parentId) => addComment(text, parentId)}
              onDelete={deleteComment}
              depth={0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

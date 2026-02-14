"use client";

import { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import { generateId } from "@/lib/utils";
import type { Comment } from "@/types";

interface UseCommentsReturn {
  comments: Comment[];
  addComment: (text: string, parentId?: string | null) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
}

/**
 * useComments — CRUD for threaded comments on a feed item.
 * Uses Dexie live query for reactivity.
 */
export function useComments(feedItemId: string): UseCommentsReturn {
  const comments =
    useLiveQuery(
      () =>
        db.comments
          .where("feedItemId")
          .equals(feedItemId)
          .sortBy("createdAt"),
      [feedItemId]
    ) ?? [];

  const addComment = useCallback(
    async (text: string, parentId: string | null = null) => {
      const now = new Date();
      const comment: Comment = {
        id: generateId(),
        feedItemId,
        parentId,
        text: text.trim(),
        createdAt: now,
        updatedAt: now,
      };
      await db.comments.add(comment);
    },
    [feedItemId]
  );

  const deleteComment = useCallback(async (commentId: string) => {
    // Delete the comment and all its children recursively
    const toDelete = [commentId];
    let i = 0;
    while (i < toDelete.length) {
      const children = await db.comments
        .where("parentId")
        .equals(toDelete[i])
        .toArray();
      for (const child of children) {
        toDelete.push(child.id);
      }
      i++;
    }
    await db.comments.bulkDelete(toDelete);
  }, []);

  return { comments, addComment, deleteComment };
}

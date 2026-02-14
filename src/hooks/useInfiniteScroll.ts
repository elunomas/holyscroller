"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * useInfiniteScroll — fires a callback when a sentinel element is near the viewport.
 * Uses IntersectionObserver for efficient scroll detection.
 */
export function useInfiniteScroll(
  onIntersect: () => void,
  options?: { rootMargin?: string; enabled?: boolean }
) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const callbackRef = useRef(onIntersect);
  callbackRef.current = onIntersect;

  const enabled = options?.enabled ?? true;
  const rootMargin = options?.rootMargin ?? "200px";

  const setSentinelRef = useCallback((node: HTMLDivElement | null) => {
    sentinelRef.current = node;
  }, []);

  useEffect(() => {
    if (!enabled || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          callbackRef.current();
        }
      },
      { rootMargin }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [enabled, rootMargin]);

  return setSentinelRef;
}

"use client";

import { useState, useEffect } from "react";
import { getCacheStats } from "@/db/verse-cache";

export function CreditsFooter() {
  const [showCredits, setShowCredits] = useState(false);
  const [stats, setStats] = useState<{
    cachedChapters: number;
    totalChapters: number;
    cachedVerses: number;
  } | null>(null);

  useEffect(() => {
    if (showCredits) {
      getCacheStats().then(setStats);
    }
  }, [showCredits]);

  return (
    <>
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-stone-200 z-40">
        <div className="max-w-lg mx-auto px-4 py-2 flex items-center justify-between">
          <span className="text-xs text-stone-400">Daily Bread</span>
          <button
            onClick={() => setShowCredits(true)}
            className="text-xs text-stone-400 hover:text-amber-600 transition-colors"
          >
            Credits &amp; Info
          </button>
        </div>
      </footer>

      {/* Credits Modal */}
      {showCredits && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setShowCredits(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30" />

          {/* Modal panel */}
          <div
            className="relative w-full max-w-lg bg-white rounded-t-2xl shadow-xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3">
              <div className="w-10 h-1 bg-stone-300 rounded-full" />
            </div>

            <div className="px-6 py-5 space-y-5">
              <h2 className="text-lg font-semibold text-stone-800">
                Credits &amp; Attribution
              </h2>

              {/* Scripture Attribution */}
              <section>
                <h3 className="text-sm font-semibold text-stone-600 uppercase tracking-wider mb-2">
                  Scripture Text
                </h3>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Scripture quotations are from the{" "}
                  <strong>World English Bible (WEB)</strong>, a public domain
                  modern English translation. The WEB is not copyrighted and may
                  be freely used without restriction.
                </p>
                <p className="text-xs text-stone-400 mt-1">
                  The World English Bible is an update of the American Standard
                  Version of 1901, produced by volunteers at{" "}
                  <a
                    href="https://ebible.org/web/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-amber-600"
                  >
                    ebible.org
                  </a>
                  .
                </p>
              </section>

              {/* API Attribution */}
              <section>
                <h3 className="text-sm font-semibold text-stone-600 uppercase tracking-wider mb-2">
                  Bible Data
                </h3>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Verse data is provided by{" "}
                  <a
                    href="https://bible-api.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-amber-600"
                  >
                    bible-api.com
                  </a>
                  , a free, open Bible API. Chapters are fetched on demand and
                  cached locally in your browser for offline use.
                </p>
              </section>

              {/* Cache Stats */}
              {stats && (
                <section>
                  <h3 className="text-sm font-semibold text-stone-600 uppercase tracking-wider mb-2">
                    Your Local Cache
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-2 bg-stone-50 rounded-lg">
                      <p className="text-lg font-semibold text-amber-700">
                        {stats.cachedVerses.toLocaleString()}
                      </p>
                      <p className="text-xs text-stone-500">Verses cached</p>
                    </div>
                    <div className="text-center p-2 bg-stone-50 rounded-lg">
                      <p className="text-lg font-semibold text-amber-700">
                        {stats.cachedChapters}
                      </p>
                      <p className="text-xs text-stone-500">Chapters</p>
                    </div>
                    <div className="text-center p-2 bg-stone-50 rounded-lg">
                      <p className="text-lg font-semibold text-amber-700">
                        {Math.round(
                          (stats.cachedChapters / stats.totalChapters) * 100
                        )}
                        %
                      </p>
                      <p className="text-xs text-stone-500">of Bible</p>
                    </div>
                  </div>
                </section>
              )}

              {/* App info */}
              <section className="border-t border-stone-100 pt-4">
                <p className="text-xs text-stone-400 text-center">
                  Daily Bread — A local-first Bible verse feed.
                  <br />
                  All data is stored locally in your browser. No account
                  required.
                </p>
              </section>

              <button
                onClick={() => setShowCredits(false)}
                className="w-full py-2.5 text-sm font-medium text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

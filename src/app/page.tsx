"use client";

import { DbProvider } from "@/components/Seed/DbProvider";
import { FeedList } from "@/components/Feed/FeedList";
import { CreditsFooter } from "@/components/Credits/CreditsFooter";

export default function Home() {
  return (
    <DbProvider>
      <main className="min-h-screen bg-stone-50 pb-16">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-stone-200">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-center">
            <h1 className="text-lg font-semibold text-stone-800 tracking-tight">
              ✝️ Daily Bread
            </h1>
          </div>
        </header>

        {/* Feed */}
        <FeedList />

        {/* Credits footer */}
        <CreditsFooter />
      </main>
    </DbProvider>
  );
}

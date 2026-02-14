"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { db } from "@/db";

interface DbState {
  ready: boolean;
  error: string | null;
}

const DbContext = createContext<DbState>({ ready: false, error: null });

/** Use this hook to check if the database is ready */
export function useDb(): DbState {
  return useContext(DbContext);
}

/**
 * DbProvider — wraps the app and ensures Dexie/IndexedDB is initialized.
 * No bulk seeding needed; verses are fetched lazily from bible-api.com.
 */
export function DbProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DbState>({ ready: false, error: null });

  useEffect(() => {
    db.open()
      .then(() => setState({ ready: true, error: null }))
      .catch((err: Error) =>
        setState({ ready: false, error: err.message })
      );
  }, []);

  if (state.error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-50">
        <div className="text-center p-8">
          <h2 className="text-xl font-semibold text-red-700 mb-2">
            Database Error
          </h2>
          <p className="text-stone-600">{state.error}</p>
          <p className="text-stone-500 text-sm mt-2">
            Try refreshing the page or clearing your browser data.
          </p>
        </div>
      </div>
    );
  }

  if (!state.ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-50">
        <div className="text-center p-8">
          <div className="animate-pulse text-2xl mb-2">✝️</div>
          <p className="text-stone-500">Preparing your daily bread...</p>
        </div>
      </div>
    );
  }

  return <DbContext.Provider value={state}>{children}</DbContext.Provider>;
}

import type { Verse } from "@/types";
import { BIBLE_BOOKS } from "@/lib/books";

/** Raw verse shape from bible-api.com */
interface BibleApiVerse {
  book_id: string;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
}

interface BibleApiResponse {
  reference: string;
  verses: BibleApiVerse[];
  translation_id: string;
  translation_name: string;
  translation_note: string;
}

/**
 * Fetch a chapter from bible-api.com (WEB translation).
 * Returns normalized Verse objects ready for Dexie storage.
 *
 * @param bookAbbr - 3-letter book abbreviation (e.g., "GEN")
 * @param chapter - Chapter number (1-indexed)
 * @returns Array of Verse objects, or null on failure
 */
export async function fetchChapter(
  bookAbbr: string,
  chapter: number
): Promise<Verse[] | null> {
  const url = `https://bible-api.com/${bookAbbr}+${chapter}?translation=web`;

  const book = BIBLE_BOOKS.find((b) => b.abbr === bookAbbr);
  if (!book) return null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        if (attempt < 2) {
          await sleep(500 * (attempt + 1));
          continue;
        }
        return null;
      }

      const data: BibleApiResponse = await res.json();
      if (!data.verses?.length) return null;

      return data.verses.map((v) => ({
        id: `${bookAbbr}:${v.chapter}:${v.verse}`,
        book: book.name,
        bookIndex: book.index,
        chapter: v.chapter,
        verse: v.verse,
        text: v.text.replace(/\n/g, " ").trim(),
        reference: `${book.name} ${v.chapter}:${v.verse}`,
      }));
    } catch {
      if (attempt < 2) await sleep(500 * (attempt + 1));
    }
  }

  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

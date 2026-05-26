import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { CATEGORIES, DIFFICULTIES, type Category, type Challenge, type Difficulty } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

const CATEGORY_ORDER: Record<Category, number> = Object.fromEntries(
  CATEGORIES.map((c, i) => [c, i])
) as Record<Category, number>;

const DIFFICULTY_ORDER: Record<Difficulty, number> = Object.fromEntries(
  DIFFICULTIES.map((d, i) => [d, i])
) as Record<Difficulty, number>;

/** Sort by category → difficulty → points → title. */
export function sortChallenges<T extends Pick<Challenge, "category" | "difficulty" | "points" | "title">>(
  list: T[]
): T[] {
  return [...list].sort((a, b) => {
    const ca = CATEGORY_ORDER[a.category] ?? 99;
    const cb = CATEGORY_ORDER[b.category] ?? 99;
    if (ca !== cb) return ca - cb;
    const da = DIFFICULTY_ORDER[a.difficulty] ?? 99;
    const db = DIFFICULTY_ORDER[b.difficulty] ?? 99;
    if (da !== db) return da - db;
    if (a.points !== b.points) return a.points - b.points;
    return a.title.localeCompare(b.title);
  });
}

/** Group sorted challenges into [category, items] tuples. */
export function groupByCategory<T extends Pick<Challenge, "category">>(
  list: T[]
): Array<[Category, T[]]> {
  const sorted = [...list].sort(
    (a, b) => (CATEGORY_ORDER[a.category] ?? 99) - (CATEGORY_ORDER[b.category] ?? 99)
  );
  const out: Array<[Category, T[]]> = [];
  for (const item of sorted) {
    const last = out[out.length - 1];
    if (last && last[0] === item.category) {
      last[1].push(item);
    } else {
      out.push([item.category, [item]]);
    }
  }
  return out;
}

import type { ColoringPage } from "@/types/game";
import { GALLERIES } from "@/data/buildings";

/** Base art templates reused across levels — all stroke line-art (no filled color thumbs) */
const ART = [
  { slug: "moonlit-castle", difficulty: "medium" as const, thumb: "/pages/moonlit-castle.svg" },
  { slug: "dragon-valley", difficulty: "hard" as const, thumb: "/pages/dragon-valley.svg" },
  { slug: "enchanted-forest", difficulty: "medium" as const, thumb: "/pages/enchanted-forest.svg" },
  { slug: "harbor-dawn", difficulty: "easy" as const, thumb: "/pages/harbor-dawn.svg" },
  { slug: "sky-temple", difficulty: "hard" as const, thumb: "/pages/sky-temple.svg" },
  { slug: "fox-meadow", difficulty: "easy" as const, thumb: "/pages/fox-meadow.svg" },
  { slug: "castle-dusk", difficulty: "medium" as const, thumb: "/pages/moonlit-castle.svg" },
  { slug: "valley-dawn", difficulty: "easy" as const, thumb: "/pages/dragon-valley.svg" },
  { slug: "harbor-glow", difficulty: "medium" as const, thumb: "/pages/harbor-dawn.svg" },
  { slug: "forest-light", difficulty: "easy" as const, thumb: "/pages/enchanted-forest.svg" },
];

const TITLE_SEEDS = [
  "Moonlit", "Dragon", "Enchanted", "Harbor", "Sky", "Fox", "Castle", "Valley", "Coral", "Forest",
];

/**
 * Paint rewards stay below gallery hang costs so painting alone can't fill the wall.
 * Scales with level: ~70% of gallery cost max.
 */
function sparksForLevel(level: number): number[] {
  const gallery = GALLERIES.find((g) => g.level === level);
  const wall =
    gallery?.frames.reduce((s, f) => s + f.stageCost, 0) ?? 380;
  const budget = Math.floor(wall * 0.68);
  const weights = [0.08, 0.11, 0.09, 0.07, 0.12, 0.07, 0.1, 0.08, 0.1, 0.08];
  const raw = weights.map((w) => Math.max(8, Math.round(budget * w)));
  const sum = raw.reduce((a, b) => a + b, 0);
  raw[raw.length - 1] += budget - sum;
  return raw;
}

const LINE_PAGES = [
  "/pages/moonlit-castle.svg",
  "/pages/dragon-valley.svg",
  "/pages/enchanted-forest.svg",
  "/pages/harbor-dawn.svg",
  "/pages/sky-temple.svg",
  "/pages/fox-meadow.svg",
];

/** Freestyle catalog — pick any stroke drawing, paint with no rewards */
export const FREESTYLE_DRAWINGS = ART.map((art, i) => ({
  id: `free-${art.slug}`,
  slug: art.slug,
  title: TITLE_SEEDS[i] ?? art.slug,
  thumbnail: art.thumb,
  lineArt: LINE_PAGES[i % LINE_PAGES.length],
  difficulty: art.difficulty,
}));

const LEVEL_COUNT = 15;

/** 10 drawings per gallery level × 15 levels */
export const COLORING_PAGES: ColoringPage[] = Array.from(
  { length: LEVEL_COUNT },
  (_, li) => {
    const level = li + 1;
    const rewards = sparksForLevel(level);
    return ART.map((art, i) => ({
      id: `l${level}-${art.slug}`,
      title: `${TITLE_SEEDS[i]} ${level > 1 ? `L${level}` : ""}`.trim() || art.slug,
      difficulty: art.difficulty,
      sparksReward: rewards[i],
      kingdomReward: Math.round(rewards[i] * 0.6),
      thumbnail: art.thumb,
      lineArt: LINE_PAGES[i % LINE_PAGES.length],
      level,
    }));
  }
).flat();

export function pagesForLevel(level: number) {
  return COLORING_PAGES.filter((p) => p.level === level);
}

export function totalPaintSparks(level: number) {
  return pagesForLevel(level).reduce((s, p) => s + p.sparksReward, 0);
}

export function totalGalleryCost(level: number) {
  const g = GALLERIES.find((x) => x.level === level);
  return g?.frames.reduce((s, f) => s + f.stageCost, 0) ?? 0;
}

export function getPageById(id: string) {
  return COLORING_PAGES.find((page) => page.id === id);
}

/** Resume in-progress page, else next unfinished in current level, else first of level */
export function getPlayPageId(
  level: number,
  pageProgress: Record<
    string,
    { completed?: boolean; percent?: number; updatedAt?: number }
  >
) {
  const pages = pagesForLevel(level);
  const inProgress = [...pages]
    .filter((p) => {
      const prog = pageProgress[p.id];
      return prog && !prog.completed && (prog.percent ?? 0) > 0;
    })
    .sort(
      (a, b) =>
        (pageProgress[b.id]?.updatedAt ?? 0) -
        (pageProgress[a.id]?.updatedAt ?? 0)
    );
  if (inProgress[0]) return inProgress[0].id;
  const next = pages.find((p) => !pageProgress[p.id]?.completed);
  return (next ?? pages[0])?.id ?? COLORING_PAGES[0].id;
}

export function difficultyMultiplier(d: ColoringPage["difficulty"]) {
  return d === "hard" ? 1.5 : d === "medium" ? 1.2 : 1;
}

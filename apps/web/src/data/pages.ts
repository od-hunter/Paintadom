import type { ColoringPage } from "@/types/game";
import { GALLERIES } from "@/data/buildings";

/** Nature, lifestyle & cozy themes — quick sessions (~5–8 min) */
export type DrawingTheme = "nature" | "lifestyle" | "pets" | "whimsy";

export type DrawingTemplate = {
  slug: string;
  title: string;
  theme: DrawingTheme;
  difficulty: ColoringPage["difficulty"];
  /** Rough minutes for a casual player */
  estMinutes: number;
  lineArt: string;
  thumb: string;
};

const DRAWING_CATALOG: DrawingTemplate[] = [
  {
    slug: "potted-flower",
    title: "Sunny Pot",
    theme: "nature",
    difficulty: "easy",
    estMinutes: 5,
    lineArt: "/pages/lifestyle/potted-flower.png",
    thumb: "/pages/lifestyle/potted-flower.png",
  },
  {
    slug: "twin-flowers",
    title: "Twin Blooms",
    theme: "nature",
    difficulty: "easy",
    estMinutes: 6,
    lineArt: "/pages/lifestyle/twin-flowers.png",
    thumb: "/pages/lifestyle/twin-flowers.png",
  },
  {
    slug: "happy-puppy",
    title: "Happy Pup",
    theme: "pets",
    difficulty: "easy",
    estMinutes: 6,
    lineArt: "/pages/lifestyle/happy-puppy.png",
    thumb: "/pages/lifestyle/happy-puppy.png",
  },
  {
    slug: "cute-kitten",
    title: "Kitten Friend",
    theme: "pets",
    difficulty: "easy",
    estMinutes: 6,
    lineArt: "/pages/lifestyle/cute-kitten.png",
    thumb: "/pages/lifestyle/cute-kitten.png",
  },
  {
    slug: "gorilla-forest",
    title: "Forest Gorilla",
    theme: "nature",
    difficulty: "easy",
    estMinutes: 7,
    lineArt: "/pages/lifestyle/gorilla-forest.png",
    thumb: "/pages/lifestyle/gorilla-forest.png",
  },
  {
    slug: "jungle-monkey",
    title: "Jungle Monkey",
    theme: "nature",
    difficulty: "easy",
    estMinutes: 7,
    lineArt: "/pages/lifestyle/jungle-monkey.png",
    thumb: "/pages/lifestyle/jungle-monkey.png",
  },
  {
    slug: "garden-elephant",
    title: "Garden Walk",
    theme: "nature",
    difficulty: "easy",
    estMinutes: 7,
    lineArt: "/pages/lifestyle/garden-elephant.png",
    thumb: "/pages/lifestyle/garden-elephant.png",
  },
  {
    slug: "safari-giraffe",
    title: "Sunny Giraffe",
    theme: "nature",
    difficulty: "easy",
    estMinutes: 6,
    lineArt: "/pages/lifestyle/safari-giraffe.png",
    thumb: "/pages/lifestyle/safari-giraffe.png",
  },
  {
    slug: "bunny-garden",
    title: "Garden Bunny",
    theme: "nature",
    difficulty: "easy",
    estMinutes: 7,
    lineArt: "/pages/lifestyle/bunny-garden.png",
    thumb: "/pages/lifestyle/bunny-garden.png",
  },
  {
    slug: "cloud-unicorn",
    title: "Cloud Unicorn",
    theme: "whimsy",
    difficulty: "easy",
    estMinutes: 6,
    lineArt: "/pages/lifestyle/cloud-unicorn.png",
    thumb: "/pages/lifestyle/cloud-unicorn.png",
  },
  {
    slug: "picnic-bear",
    title: "Picnic Day",
    theme: "lifestyle",
    difficulty: "medium",
    estMinutes: 7,
    lineArt: "/pages/lifestyle/picnic-bear.png",
    thumb: "/pages/lifestyle/picnic-bear.png",
  },
  {
    slug: "duckling-bench",
    title: "Bench Treat",
    theme: "lifestyle",
    difficulty: "medium",
    estMinutes: 7,
    lineArt: "/pages/lifestyle/duckling-bench.png",
    thumb: "/pages/lifestyle/duckling-bench.png",
  },
  {
    slug: "beach-bear",
    title: "Beach Day",
    theme: "lifestyle",
    difficulty: "medium",
    estMinutes: 7,
    lineArt: "/pages/lifestyle/beach-bear.png",
    thumb: "/pages/lifestyle/beach-bear.png",
  },
  {
    slug: "sunflower-rainbow",
    title: "Sun & Rainbow",
    theme: "nature",
    difficulty: "medium",
    estMinutes: 8,
    lineArt: "/pages/lifestyle/sunflower-rainbow.png",
    thumb: "/pages/lifestyle/sunflower-rainbow.png",
  },
  {
    slug: "banana-rocker",
    title: "Banana Ride",
    theme: "whimsy",
    difficulty: "medium",
    estMinutes: 7,
    lineArt: "/pages/lifestyle/banana-rocker.png",
    thumb: "/pages/lifestyle/banana-rocker.png",
  },
  {
    slug: "flower-girl",
    title: "Flower Crown",
    theme: "lifestyle",
    difficulty: "medium",
    estMinutes: 8,
    lineArt: "/pages/lifestyle/flower-girl.png",
    thumb: "/pages/lifestyle/flower-girl.png",
  },
  {
    slug: "dancing-girl",
    title: "Dance Break",
    theme: "lifestyle",
    difficulty: "medium",
    estMinutes: 8,
    lineArt: "/pages/lifestyle/dancing-girl.png",
    thumb: "/pages/lifestyle/dancing-girl.png",
  },
  {
    slug: "mermaid-cove",
    title: "Mermaid Cove",
    theme: "whimsy",
    difficulty: "hard",
    estMinutes: 8,
    lineArt: "/pages/lifestyle/mermaid-cove.png",
    thumb: "/pages/lifestyle/mermaid-cove.png",
  },
  {
    slug: "balloon-bear",
    title: "Balloon Day",
    theme: "whimsy",
    difficulty: "hard",
    estMinutes: 8,
    lineArt: "/pages/lifestyle/balloon-bear.png",
    thumb: "/pages/lifestyle/balloon-bear.png",
  },
];

const PAGES_PER_LEVEL = 10;
const LEVEL_COUNT = 15;

/** Rotate catalog so each wing feels fresh — no repeated slug within a level */
function templatesForLevel(level: number): DrawingTemplate[] {
  const offset = ((level - 1) * 4) % DRAWING_CATALOG.length;
  return Array.from({ length: PAGES_PER_LEVEL }, (_, i) => {
    return DRAWING_CATALOG[(offset + i) % DRAWING_CATALOG.length];
  });
}

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

/** Freestyle — full library, paint freely with no Sparks */
export const FREESTYLE_DRAWINGS = DRAWING_CATALOG.map((d) => ({
  id: `free-${d.slug}`,
  slug: d.slug,
  title: d.title,
  thumbnail: d.thumb,
  lineArt: d.lineArt,
  difficulty: d.difficulty,
  theme: d.theme,
  estMinutes: d.estMinutes,
}));

/** 10 drawings per gallery level × 15 levels */
export const COLORING_PAGES: ColoringPage[] = Array.from(
  { length: LEVEL_COUNT },
  (_, li) => {
    const level = li + 1;
    const rewards = sparksForLevel(level);
    const templates = templatesForLevel(level);
    return templates.map((art, i) => ({
      id: `l${level}-${art.slug}`,
      title: level > 1 ? `${art.title} · L${level}` : art.title,
      difficulty: art.difficulty,
      sparksReward: rewards[i],
      kingdomReward: Math.round(rewards[i] * 0.6),
      thumbnail: art.thumb,
      lineArt: art.lineArt,
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

export function getDrawingCatalog() {
  return DRAWING_CATALOG;
}

import type { GoalProgress } from "@/types/game";

/** Side-rail challenge hubs on the home screen */
export type ChallengeId =
  | "ads"
  | "daily"
  | "puzzle"
  | "tournament"
  | "spin"
  | "streak";

export interface ChallengeHub {
  id: ChallengeId;
  title: string;
  blurb: string;
  icon: string;
  /** Tailwind gradient for the round button */
  gradient: string;
  shadow: string;
  side: "left" | "right";
}

export const CHALLENGE_HUBS: ChallengeHub[] = [
  {
    id: "ads",
    title: "Videos",
    blurb: "Watch short videos for Sparks — more views, bigger rewards",
    icon: "/icons/play.svg",
    gradient: "from-sky-300 to-blue-600",
    shadow: "#1d4ed8",
    side: "left",
  },
  {
    id: "daily",
    title: "Daily Login",
    blurb: "Claim your streak calendar gifts every day",
    icon: "/icons/daily.webp",
    gradient: "from-amber-300 to-orange-500",
    shadow: "#c2410c",
    side: "left",
  },
  {
    id: "spin",
    title: "Spin",
    blurb: "Spin the palette wheel for Sparks & Markers",
    icon: "/icons/spin.webp",
    gradient: "from-fuchsia-300 to-pink-600",
    shadow: "#9d174d",
    side: "left",
  },
  {
    id: "puzzle",
    title: "Puzzle",
    blurb: "Spend Markers from accurate coloring to reveal the picture",
    icon: "/icons/puzzle.webp",
    gradient: "from-violet-300 to-purple-600",
    shadow: "#6b21a8",
    side: "right",
  },
  {
    id: "tournament",
    title: "Tournaments",
    blurb: "Daily & weekly painting contests for Sparks and prizes",
    icon: "/icons/trophy.webp",
    gradient: "from-violet-300 to-indigo-600",
    shadow: "#4338ca",
    side: "right",
  },
  {
    id: "streak",
    title: "Streak Bonus",
    blurb: "Keep painting daily — claim streak Sparks",
    icon: "/icons/streak.webp",
    gradient: "from-rose-300 to-red-500",
    shadow: "#b91c1c",
    side: "right",
  },
];

/** Escalating spark rewards for consecutive videos today (max 8 / 24h) */
export const AD_SPARK_TIERS = [15, 25, 40, 55, 80, 100, 130, 160];

/** Special ad index (0-based) that grants temporary art discount */
export const AD_DISCOUNT_SLOT = 2; // 3rd video of the day
export const AD_DISCOUNT_PCT = 25;
export const AD_DISCOUNT_MS = 30 * 60_000; // 30 minutes

/** Watch durations cycle 30s → 45s → 60s */
export const AD_VIDEO_DURATIONS_SEC = [30, 45, 60, 30, 45, 60, 30, 45] as const;

/**
 * Short free sample clips (Google sample bucket).
 * Player enforces required watch time from AD_VIDEO_DURATIONS_SEC.
 */
export const AD_VIDEO_SRCS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4",
] as const;

export function getAdVideo(index: number) {
  const i = Math.max(0, Math.min(AD_SPARK_TIERS.length - 1, index));
  return {
    index: i,
    sparks: AD_SPARK_TIERS[i],
    durationSec: AD_VIDEO_DURATIONS_SEC[i],
    src: AD_VIDEO_SRCS[i % AD_VIDEO_SRCS.length],
    unlocksDiscount: i === AD_DISCOUNT_SLOT,
  };
}

export interface PuzzlePieceDef {
  id: string;
  cost: number;
  /** Row-major index 0..8 */
  index: number;
  gift?: boolean;
}

export interface PuzzleLevelDef {
  id: string;
  level: number;
  title: string;
  art: string;
  completeSparks: number;
  pieces: PuzzlePieceDef[];
}

/** 3×3 puzzles — costs burn Markers earned from accurate coloring */
export const PUZZLE_LEVELS: PuzzleLevelDef[] = [
  {
    id: "pz-1",
    level: 1,
    title: "Sunrise Studio",
    art: "/gallery-art/moonlit-castle.svg",
    completeSparks: 90,
    pieces: [
      { id: "p0", index: 0, cost: 8 },
      { id: "p1", index: 1, cost: 10 },
      { id: "p2", index: 2, cost: 9 },
      { id: "p3", index: 3, cost: 12, gift: true },
      { id: "p4", index: 4, cost: 14 },
      { id: "p5", index: 5, cost: 11 },
      { id: "p6", index: 6, cost: 13 },
      { id: "p7", index: 7, cost: 15 },
      { id: "p8", index: 8, cost: 18 },
    ],
  },
  {
    id: "pz-2",
    level: 2,
    title: "Harbor Glow",
    art: "/gallery-art/harbor-dawn.svg",
    completeSparks: 160,
    pieces: [
      { id: "p0", index: 0, cost: 12 },
      { id: "p1", index: 1, cost: 14 },
      { id: "p2", index: 2, cost: 16 },
      { id: "p3", index: 3, cost: 18, gift: true },
      { id: "p4", index: 4, cost: 22 },
      { id: "p5", index: 5, cost: 20 },
      { id: "p6", index: 6, cost: 24 },
      { id: "p7", index: 7, cost: 26 },
      { id: "p8", index: 8, cost: 30 },
    ],
  },
  {
    id: "pz-3",
    level: 3,
    title: "Sky Temple",
    art: "/gallery-art/sky-temple.svg",
    completeSparks: 260,
    pieces: [
      { id: "p0", index: 0, cost: 16 },
      { id: "p1", index: 1, cost: 18 },
      { id: "p2", index: 2, cost: 22 },
      { id: "p3", index: 3, cost: 26, gift: true },
      { id: "p4", index: 4, cost: 30 },
      { id: "p5", index: 5, cost: 28 },
      { id: "p6", index: 6, cost: 34 },
      { id: "p7", index: 7, cost: 38 },
      { id: "p8", index: 8, cost: 42 },
    ],
  },
];

export function getPuzzleLevel(level: number) {
  const idx = ((level - 1) % PUZZLE_LEVELS.length);
  const base = PUZZLE_LEVELS[idx];
  if (level <= PUZZLE_LEVELS.length) return base;
  // Scale costs for higher gallery levels
  const mult = 1 + (level - 1) * 0.35;
  return {
    ...base,
    id: `pz-${level}`,
    level,
    title: `${base.title} · L${level}`,
    completeSparks: Math.round(base.completeSparks * mult),
    pieces: base.pieces.map((p) => ({
      ...p,
      cost: Math.round(p.cost * mult),
    })),
  };
}

/** Highest puzzle stage players can clear */
export const MAX_PUZZLE_LEVEL = 15;

/** Clean coloring → puzzle points (percent quality weighted) */
export function puzzlePointsFromQuality(percent: number, difficulty: string) {
  const quality = Math.max(40, Math.min(100, percent)) / 100;
  const base =
    difficulty === "hard" ? 55 : difficulty === "medium" ? 40 : 28;
  return Math.round(base * quality);
}

export interface TournamentDef {
  id: string;
  kind: "daily" | "weekly";
  title: string;
  blurb: string;
  entryCost: number;
  /** Simulated opponent scores for UI */
  prizes: { place: number; sparks: number; puzzlePoints: number; moves: number }[];
}

export const TOURNAMENTS: TournamentDef[] = [
  {
    id: "tour-daily",
    kind: "daily",
    title: "Daily Brush Race",
    blurb: "Paint pages today — top painters split the pot",
    entryCost: 0,
    prizes: [
      { place: 1, sparks: 120, puzzlePoints: 40, moves: 3 },
      { place: 2, sparks: 70, puzzlePoints: 25, moves: 2 },
      { place: 3, sparks: 40, puzzlePoints: 15, moves: 1 },
    ],
  },
  {
    id: "tour-weekly",
    kind: "weekly",
    title: "Weekly Gallery Cup",
    blurb: "Hang frames & paint all week for grand prizes",
    entryCost: 25,
    prizes: [
      { place: 1, sparks: 400, puzzlePoints: 120, moves: 5 },
      { place: 2, sparks: 220, puzzlePoints: 70, moves: 3 },
      { place: 3, sparks: 120, puzzlePoints: 40, moves: 2 },
    ],
  },
];

export const SPIN_REWARDS = [
  { label: "+20 Sparks", sparks: 20, puzzlePoints: 0, moves: 0 },
  { label: "+12 Markers", sparks: 0, puzzlePoints: 12, moves: 0 },
  { label: "+35 Sparks", sparks: 35, puzzlePoints: 0, moves: 0 },
  { label: "+1 Move", sparks: 0, puzzlePoints: 0, moves: 1 },
  { label: "+50 Sparks", sparks: 50, puzzlePoints: 0, moves: 0 },
  { label: "+25 Markers", sparks: 0, puzzlePoints: 25, moves: 0 },
];

/** Minutes until next spin — 8 hours after each claim; spin count resets after 24h */
export function spinCooldownMinutes(_spinsInWindow: number) {
  return 480; // 8 hours
}

/** Keep goals helper for legacy bump — map to empty if unused */
export function emptyGoals(): GoalProgress[] {
  return [];
}

import type { Achievement, DailyReward, GoalProgress } from "@/types/game";
import { GOALS } from "@/data/buildings";

export const DEFAULT_DAILY_REWARDS: Omit<DailyReward, "claimed">[] = [
  { day: 1, label: "Day 1", sparks: 50, type: "sparks" },
  { day: 2, label: "Day 2", sparks: 80, type: "sparks" },
  { day: 3, label: "Day 3", sparks: 120, type: "sparks" },
  { day: 4, label: "Day 4", sparks: 150, type: "sparks" },
  { day: 5, label: "Day 5", sparks: 200, type: "chest" },
  { day: 6, label: "Day 6", sparks: 250, type: "building" },
  { day: 7, label: "Day 7", sparks: 400, type: "legend" },
];

export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: "first-stroke", title: "First Stroke", description: "Paint your first page", unlocked: false, icon: "/icons/paint.webp" },
  { id: "streak-3", title: "Warm Hands", description: "Reach a 3-day streak", unlocked: false, icon: "/icons/streak.webp" },
  { id: "streak-7", title: "Dedicated Painter", description: "Reach a 7-day streak", unlocked: false, icon: "/icons/trophy.webp" },
  { id: "kingdom-builder", title: "Gallery Curator", description: "Finish a full gallery wing", unlocked: false, icon: "/icons/gallery.webp" },
  { id: "hard-mode", title: "Bold Palette", description: "Complete a hard page", unlocked: false, icon: "/icons/gift.webp" },
];

export const DEMO_LEADERBOARD = [
  { id: "1", username: "NovaFox", kingdomScore: 18420, level: 3, rank: 1 },
  { id: "2", username: "PaintQueen", kingdomScore: 16210, level: 3, rank: 2 },
  { id: "3", username: "LumoriaKing", kingdomScore: 14980, level: 2, rank: 3 },
  { id: "4", username: "BrikBuilder", kingdomScore: 13100, level: 2, rank: 4 },
  { id: "5", username: "PikaGlow", kingdomScore: 11840, level: 2, rank: 5 },
  { id: "6", username: "You", kingdomScore: 240, level: 1, rank: 6, isYou: true },
  { id: "7", username: "SoftBrush", kingdomScore: 180, level: 1, rank: 7 },
  { id: "8", username: "CastleKid", kingdomScore: 120, level: 1, rank: 8 },
];

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function freshGoals(): GoalProgress[] {
  const now = Date.now();
  return GOALS.map((g) => ({
    id: g.id,
    progress: 0,
    claimed: false,
    expiresAt: now + g.expiresInHours * 3600_000,
  }));
}

export function calculateKingdomScore(input: {
  pagesCompleted: number;
  avgDifficulty: number;
  streak: number;
  stagesBuilt: number;
}) {
  return Math.round(
    input.pagesCompleted * input.avgDifficulty * 100 +
      input.streak * 40 +
      input.stagesBuilt * 80
  );
}

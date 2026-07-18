"use client";

import { useMemo, useState } from "react";
import { useGameStore } from "@/store/game-store";
import { CenteredModal } from "@/components/ui/centered-modal";
import { playSfx } from "@/lib/audio";
import { DEMO_LEADERBOARD } from "@/data/rewards";
import { getCompletedPageCount } from "@/store/game-store";

type Category = "level" | "accuracy";
type Period = "week" | "month" | "year";

export function LeaderboardPanel({
  open,
  onClose,
  onBack,
}: {
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
}) {
  const [category, setCategory] = useState<Category>("level");
  const [period, setPeriod] = useState<Period>("week");
  const username = useGameStore((s) => s.username);
  const level = useGameStore((s) => s.level);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const accuracySum = useGameStore((s) => s.accuracySum);
  const accuracySamples = useGameStore((s) => s.accuracySamples);
  const yourAccuracy =
    accuracySamples > 0 ? Math.round(accuracySum / accuracySamples) : 0;

  const rows = useMemo(() => {
    const base = DEMO_LEADERBOARD.map((e, i) => ({
      ...e,
      accuracy: e.isYou
        ? yourAccuracy || 72
        : [94, 91, 88, 85, 82, 70, 68, 60][i] ?? 75,
    }));
    const withYou = base.map((e) =>
      e.isYou
        ? {
            ...e,
            username: username || "You",
            level,
            kingdomScore: Math.max(e.kingdomScore, getCompletedPageCount() * 120),
            accuracy: yourAccuracy || e.accuracy,
          }
        : e
    );
    const sorted = [...withYou].sort((a, b) =>
      category === "level"
        ? b.level - a.level || b.kingdomScore - a.kingdomScore
        : b.accuracy - a.accuracy || b.level - a.level
    );
    // Period only reshuffles demo slightly for UI clarity
    const skew = period === "year" ? 0 : period === "month" ? 1 : 2;
    return sorted.map((e, idx) => ({
      ...e,
      rank: idx + 1,
      displayScore:
        category === "level"
          ? `Lv ${e.level}`
          : `${e.accuracy}%`,
      tip:
        category === "level"
          ? `${e.kingdomScore + skew * 10} pts`
          : `Lv ${e.level}`,
    }));
  }, [category, period, username, level, yourAccuracy]);

  return (
    <CenteredModal open={open} onClose={onClose} zIndex={95}>
      <div className="flex max-h-[min(90dvh,720px)] w-full flex-col overflow-hidden rounded-[1.85rem] border-[5px] border-white bg-gradient-to-b from-indigo-400 via-violet-500 to-purple-800 shadow-[0_14px_0_rgba(0,0,0,0.28)]">
        <div className="relative shrink-0 px-4 pb-2 pt-4 text-center">
          <h2
            className="font-display text-2xl font-black uppercase text-white"
            style={{ textShadow: "0 3px 0 rgba(0,0,0,0.35)" }}
          >
            Leaderboard
          </h2>
          <button
            type="button"
            onClick={onBack ?? onClose}
            className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white bg-indigo-500 text-lg font-black text-white"
            aria-label="Back"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white bg-red-500 text-xl font-black text-white"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-5">
          <p className="rounded-xl bg-black/25 px-3 py-2 text-center text-xs font-bold leading-snug text-white">
            Rank by <span className="font-black">gallery level</span> or by{" "}
            <span className="font-black">paint accuracy</span> (clean coloring,
            not scribbling). Pick a time range below.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["level", "By Level"],
                ["accuracy", "By Accuracy"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  playSfx("tap", soundEnabled);
                  setCategory(id);
                }}
                className={`rounded-2xl border-[3px] py-2.5 font-display text-sm font-black ${
                  category === id
                    ? "border-white bg-amber-400 text-amber-950 shadow-[0_4px_0_#b45309]"
                    : "border-white/60 bg-white/20 text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex gap-1 rounded-2xl bg-black/20 p-1">
            {(
              [
                ["week", "Week"],
                ["month", "Month"],
                ["year", "Year"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  playSfx("tap", soundEnabled);
                  setPeriod(id);
                }}
                className={`flex-1 rounded-xl py-2 text-xs font-black ${
                  period === id
                    ? "bg-white text-violet-900"
                    : "text-white/90"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {rows.slice(0, 8).map((entry) => (
              <div
                key={entry.id}
                className={`flex items-center gap-3 rounded-2xl border-[3px] px-3 py-2.5 ${
                  entry.isYou
                    ? "border-amber-300 bg-amber-100"
                    : "border-white/70 bg-white"
                }`}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 font-display text-sm font-black text-white">
                  {entry.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm font-black text-slate-900">
                    {entry.username}
                  </p>
                  <p className="text-[11px] font-bold text-slate-600">
                    {entry.tip}
                  </p>
                </div>
                <span className="rounded-full bg-violet-100 px-2.5 py-1 font-display text-sm font-black text-violet-900">
                  {entry.displayScore}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CenteredModal>
  );
}

"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { DEMO_LEADERBOARD, calculateKingdomScore } from "@/data/rewards";
import {
  useGameStore,
  getAverageDifficultyMultiplier,
  getCompletedPageCount,
  getTotalStagesBuilt,
} from "@/store/game-store";
import { cn } from "@/lib/utils";

const TABS = ["Season", "World", "Week"] as const;

export function LeaderboardScreen() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Season");
  const username = useGameStore((s) => s.username);
  const level = useGameStore((s) => s.level);
  const streak = useGameStore((s) => s.streak);
  const buildingStages = useGameStore((s) => s.buildingStages);

  const yourScore = useMemo(
    () =>
      calculateKingdomScore({
        pagesCompleted: Math.max(0, getCompletedPageCount()),
        avgDifficulty: getAverageDifficultyMultiplier(),
        streak,
        stagesBuilt: getTotalStagesBuilt(),
      }),
    [streak, buildingStages]
  );

  const rows = DEMO_LEADERBOARD.map((entry) =>
    entry.isYou
      ? {
          ...entry,
          username: username || "You",
          level,
          kingdomScore: Math.max(yourScore, 10),
        }
      : entry
  )
    .sort((a, b) => b.kingdomScore - a.kingdomScore)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 pb-12 pt-16">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="font-display text-3xl font-bold text-ink"
            style={{ textShadow: "0 3px 0 rgba(255,255,255,0.7)" }}
          >
            Friends
          </h1>
          <p className="text-sm font-bold text-ink/60">Friendly rivalry with Nova</p>
        </div>
        <Image src="/mascots/nova.webp" alt="Nova" width={64} height={64} className="bob" />
      </div>

      <div className="flex gap-1 rounded-2xl bg-white/70 p-1 shadow-inner">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={cn(
              "flex-1 rounded-xl py-2 text-sm font-bold transition",
              tab === item ? "bg-purple text-white shadow" : "text-ink/60"
            )}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {rows.slice(0, 8).map((entry, index) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className={cn(
              "panel-3d flex items-center gap-3 !border-2 px-3 py-3",
              entry.isYou && "!border-gold bg-amber-50"
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-sm font-black",
                entry.rank === 1
                  ? "bg-gold text-amber-950"
                  : entry.rank === 2
                    ? "bg-slate-200 text-slate-700"
                    : entry.rank === 3
                      ? "bg-orange-300 text-orange-950"
                      : "bg-violet-100 text-ink"
              )}
            >
              {entry.rank}
            </span>
            <div className="flex-1">
              <p className="font-bold text-ink">
                {entry.username}
                {entry.isYou ? " · you" : ""}
              </p>
              <p className="text-xs font-bold text-ink/50">Lv {entry.level}</p>
            </div>
            <p className="font-black text-purple">{entry.kingdomScore}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

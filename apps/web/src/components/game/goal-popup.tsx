"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { GoalDef } from "@/data/buildings";
import { GameIcon } from "@/components/ui/game-icon";

function formatRemaining(ms: number) {
  if (ms <= 0) return "Expired";
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${m}m`;
}

const PANEL_TINT: Record<string, string> = {
  "daily-login": "from-sky-300 to-blue-500",
  "daily-paint": "from-fuchsia-300 to-purple-500",
  "daily-hang": "from-amber-300 to-orange-500",
  "weekly-pages": "from-lime-300 to-emerald-500",
  "weekly-streak": "from-rose-300 to-red-500",
  "chal-curator": "from-violet-300 to-indigo-600",
};

export function GoalPopup({
  goal,
  progress,
  claimed,
  expiresAt,
  onClose,
  onClaim,
}: {
  goal: GoalDef;
  progress: number;
  claimed: boolean;
  expiresAt: number;
  onClose: () => void;
  onClaim: () => void;
}) {
  const ready = !claimed && progress >= goal.target;
  const pct = Math.min(100, Math.round((progress / goal.target) * 100));
  const tint = PANEL_TINT[goal.id] ?? "from-violet-300 to-purple-600";

  return (
    <AnimatePresence>
      <motion.button
        type="button"
        aria-label="Close"
        className="fixed inset-0 z-[80] bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-label={goal.title}
        initial={{ opacity: 0, scale: 0.85, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        className="fixed inset-x-4 top-[18%] z-[90] mx-auto max-w-sm overflow-hidden rounded-[1.75rem] border-4 border-white shadow-2xl"
        style={{
          background: "linear-gradient(180deg, #ede9fe 0%, #ddd6fe 40%, #c4b5fd 100%)",
          boxShadow:
            "0 10px 0 rgba(76,29,149,0.45), 0 18px 40px rgba(0,0,0,0.35)",
        }}
      >
        <div className={`bg-gradient-to-b ${tint} px-4 pb-5 pt-3`}>
          <div className="flex items-start justify-between">
            <span className="rounded-full bg-black/25 px-3 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
              {goal.kind}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-white bg-white/90 text-ink shadow"
              aria-label="Close goal"
            >
              <X className="h-5 w-5 stroke-[3]" />
            </button>
          </div>

          <div className="mt-2 flex flex-col items-center">
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full border-[4px] border-white bg-white/95"
              style={{
                boxShadow: "0 6px 0 rgba(0,0,0,0.2), inset 0 2px 0 rgba(255,255,255,0.8)",
              }}
            >
              <GameIcon src={goal.icon} size={64} />
            </div>
            <h2
              className="mt-3 text-center font-display text-2xl font-black text-white"
              style={{ textShadow: "0 3px 0 rgba(0,0,0,0.35)" }}
            >
              {goal.title}
            </h2>
            <p className="mt-1 text-center text-xs font-bold text-white/90">
              Ends in {formatRemaining(expiresAt - Date.now())}
            </p>
          </div>
        </div>

        <div className="space-y-3 px-4 py-4">
          <div
            className="rounded-2xl border-[3px] border-white bg-white/90 p-3"
            style={{ boxShadow: "0 4px 0 rgba(109,40,217,0.25)" }}
          >
            <div className="mb-2 flex items-center justify-between text-xs font-black text-ink">
              <span>
                Progress {progress}/{goal.target}
              </span>
              <span>{pct}%</span>
            </div>
            <div className="h-4 overflow-hidden rounded-full border-2 border-violet-200 bg-violet-100">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-lime-300 to-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 18 }}
                style={{
                  boxShadow: "inset 0 2px 0 rgba(255,255,255,0.6)",
                }}
              />
            </div>
          </div>

          <div
            className="flex items-center justify-center gap-2 rounded-2xl border-[3px] border-white bg-gradient-to-b from-amber-100 to-amber-200 px-3 py-2"
            style={{ boxShadow: "0 4px 0 rgba(180,83,9,0.35)" }}
          >
            <GameIcon src="/icons/gift.webp" size={28} />
            <span className="font-display text-lg font-black text-amber-950">
              Reward
            </span>
            <span className="flex items-center gap-1 rounded-full bg-amber-950 px-3 py-1 text-sm font-black text-amber-100">
              <GameIcon src="/icons/sparks.webp" size={16} />
              +{goal.rewardSparks}
            </span>
          </div>

          {claimed ? (
            <div className="rounded-2xl bg-emerald-100 py-3 text-center text-sm font-black text-emerald-700">
              Claimed — nice work!
            </div>
          ) : ready ? (
            <button
              type="button"
              onClick={() => {
                onClaim();
                onClose();
              }}
              className="btn-lime w-full active:translate-y-1"
              style={{ textShadow: "0 2px 0 rgba(0,0,0,0.2)" }}
            >
              Claim Sparks!
            </button>
          ) : (
            <div className="rounded-2xl bg-white/80 py-3 text-center text-sm font-bold text-ink/70">
              Keep going — {goal.target - progress} more to go
            </div>
          )}

          <div className="flex justify-center pb-1">
            <Image
              src="/mascots/pika.webp"
              alt=""
              width={48}
              height={48}
              className="drop-shadow"
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

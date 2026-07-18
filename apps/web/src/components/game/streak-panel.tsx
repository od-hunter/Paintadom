"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/store/game-store";
import { GameIcon } from "@/components/ui/game-icon";
import { CenteredModal } from "@/components/ui/centered-modal";
import { formatFullCountdown } from "@/lib/format-countdown";

export function StreakPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const streak = useGameStore((s) => s.streak);
  const claimStreakBonus = useGameStore((s) => s.claimStreakBonus);
  const streakClaimUntil = useGameStore((s) => s.streakClaimUntil);
  const [now, setNow] = useState(Date.now());
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, [open]);

  const ready = streak >= 1 && streakClaimUntil <= now;
  const left = Math.max(0, streakClaimUntil - now);

  return (
    <CenteredModal open={open} onClose={onClose} zIndex={92}>
      <div className="flex max-h-[min(88dvh,560px)] w-full flex-col overflow-hidden rounded-[1.75rem] border-4 border-white bg-white shadow-[0_12px_0_rgba(0,0,0,0.28)]">
        <div className="relative shrink-0 bg-gradient-to-r from-rose-400 to-red-500 px-4 py-3 text-center">
          <h2
            className="font-display text-xl font-black text-white"
            style={{ textShadow: "0 2px 0 rgba(0,0,0,0.35)" }}
          >
            Streak Bonus
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-red-600 text-lg font-black text-white"
          >
            ×
          </button>
        </div>
        <div className="p-4 text-center">
          <GameIcon src="/icons/streak.webp" size={72} className="mx-auto" />
          <p className="mt-2 font-display text-3xl font-black text-slate-900">
            {streak} day streak
          </p>
          <p className="mt-1 text-sm font-bold text-slate-700">
            Claim once, then wait 24 hours for the next streak gift.
          </p>

          {!ready && streakClaimUntil > 0 && (
            <div className="mt-3 rounded-2xl border-2 border-rose-200 bg-rose-50 px-3 py-3">
              <p className="text-xs font-black uppercase text-rose-700">
                Next reward in
              </p>
              <p className="mt-1 font-display text-2xl font-black text-slate-900">
                {formatFullCountdown(left)}
              </p>
            </div>
          )}

          <button
            type="button"
            disabled={!ready}
            onClick={() => {
              const got = claimStreakBonus();
              setMsg(
                got != null
                  ? `+${got} Sparks! Come back in 24h`
                  : "Reward on cooldown"
              );
            }}
            className="mt-4 w-full rounded-2xl border-b-[6px] border-red-900 bg-gradient-to-b from-rose-300 to-red-500 py-4 font-display text-xl font-black text-white disabled:opacity-45"
          >
            {ready ? "Claim streak Sparks" : "On 24h cooldown"}
          </button>
          {msg && (
            <p className="mt-2 text-sm font-black text-emerald-700">{msg}</p>
          )}
        </div>
      </div>
    </CenteredModal>
  );
}

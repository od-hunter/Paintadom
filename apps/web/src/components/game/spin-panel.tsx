"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "@/store/game-store";
import { GameIcon } from "@/components/ui/game-icon";
import { CenteredModal } from "@/components/ui/centered-modal";
import { formatFullCountdown } from "@/lib/format-countdown";

function Shell({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <CenteredModal open={open} onClose={onClose} zIndex={92}>
      <div className="flex max-h-[min(88dvh,620px)] w-full flex-col overflow-hidden rounded-[1.75rem] border-4 border-white bg-white shadow-[0_12px_0_rgba(0,0,0,0.28)]">
        <div className="relative shrink-0 bg-gradient-to-r from-fuchsia-400 to-pink-600 px-4 py-3 text-center">
          <h2
            className="font-display text-xl font-black text-white"
            style={{ textShadow: "0 2px 0 rgba(0,0,0,0.35)" }}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-red-500 text-lg font-black text-white"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </CenteredModal>
  );
}

export function SpinPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const rollSpin = useGameStore((s) => s.rollSpin);
  const claimPendingSpin = useGameStore((s) => s.claimPendingSpin);
  const pendingSpin = useGameStore((s) => s.pendingSpin);
  const spinCooldownUntil = useGameStore((s) => s.spinCooldownUntil);
  const spinsInWindow = useGameStore((s) => s.spinsInWindow);

  const [now, setNow] = useState(Date.now());
  const [spinning, setSpinning] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, [open]);

  const cooling = spinCooldownUntil > now && !pendingSpin;
  const coolLeft = Math.max(0, spinCooldownUntil - now);

  return (
    <Shell open={open} onClose={onClose} title="Lucky Spin">
      <p className="text-center text-sm font-black text-slate-800">
        Spin the wheel, then <span className="text-fuchsia-700">Claim</span> your
        prize. After you claim, wait 8 hours for the next spin.
      </p>

      <motion.div
        className="mx-auto mt-3 flex h-36 w-36 items-center justify-center"
        animate={spinning ? { rotate: 1080 } : { rotate: 0 }}
        transition={
          spinning ? { duration: 1.5, ease: "easeOut" } : { duration: 0.2 }
        }
      >
        <GameIcon src="/icons/spin.webp" size={132} />
      </motion.div>

      {pendingSpin && (
        <div className="mt-2 rounded-2xl border-2 border-fuchsia-300 bg-fuchsia-50 px-3 py-3 text-center">
          <p className="text-xs font-black uppercase text-fuchsia-700">
            Prize ready
          </p>
          <p className="mt-1 font-display text-2xl font-black text-slate-900">
            {pendingSpin.label}
          </p>
        </div>
      )}

      {cooling && (
        <div className="mt-2 rounded-2xl border-2 border-slate-300 bg-slate-100 px-3 py-3 text-center">
          <p className="text-xs font-black uppercase text-slate-600">
            Next spin in
          </p>
          <p className="mt-1 font-display text-3xl font-black text-slate-900">
            {formatFullCountdown(coolLeft)}
          </p>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {!pendingSpin && (
          <button
            type="button"
            disabled={cooling || spinning}
            onClick={() => {
              setFlash(null);
              setSpinning(true);
              window.setTimeout(() => {
                const r = rollSpin();
                setSpinning(false);
                if (!r) setFlash("Wait for the timer!");
              }, 1500);
            }}
            className="w-full rounded-2xl border-b-[6px] border-yellow-700 bg-gradient-to-b from-yellow-300 to-amber-500 py-4 font-display text-xl font-black text-amber-950 shadow-lg disabled:opacity-45"
          >
            {spinning ? "Spinning…" : cooling ? "On cooldown" : "SPIN"}
          </button>
        )}

        {pendingSpin && (
          <button
            type="button"
            onClick={() => {
              const got = claimPendingSpin();
              if (got) {
                setFlash(`Claimed ${got.label}! Next spin in 8h`);
              }
            }}
            className="btn-lime w-full border-b-[6px] py-4 font-display text-xl shadow-lg"
          >
            CLAIM REWARD
          </button>
        )}
      </div>

      <p className="mt-3 text-center text-[11px] font-bold text-slate-600">
        Spins today: {spinsInWindow}
      </p>
      {flash && (
        <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-center text-sm font-black text-emerald-800">
          {flash}
        </p>
      )}
    </Shell>
  );
}

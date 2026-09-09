"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getGallery } from "@/data/buildings";
import { GameIcon } from "@/components/ui/game-icon";
import { LevelMapPopup } from "@/components/game/level-map-popup";
import { useGameStore } from "@/store/game-store";
import { useChainEconomy } from "@/hooks/use-chain-economy";

type Phase = "celebrate" | "rewards" | "map" | "done";

const LEVEL_GIFTS: Record<
  number,
  { title: string; sparks: number; body: string }[]
> = {
  2: [
    { title: "Wing Bonus", sparks: 40, body: "Color Hall unlock gift!" },
    { title: "Painter Chest", sparks: 60, body: "Extra Sparks for the new wing" },
  ],
  3: [
    { title: "Royal Bonus", sparks: 80, body: "Atelier unlock gift!" },
    { title: "Master Chest", sparks: 120, body: "Legendary Spark stash" },
  ],
};

/**
 * After finishing a gallery wing:
 * celebrate (auto) → map → tap next kingdom → sign & claim → unlock
 */
export function LevelUpFlow({
  open,
  completedLevel,
  nextLevel,
  onFinished,
  startAtMap = false,
}: {
  open: boolean;
  completedLevel: number;
  nextLevel: number;
  onFinished: () => void;
  /** Skip congrats when resuming an unfinished level-up */
  startAtMap?: boolean;
}) {
  const buySparks = useGameStore((s) => s.buySparks);
  const confirmLevelAdvance = useGameStore((s) => s.confirmLevelAdvance);
  const [phase, setPhase] = useState<Phase>("celebrate");
  const [rewardIdx, setRewardIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const gallery = getGallery(completedLevel);
  const gifts = LEVEL_GIFTS[nextLevel] ?? [
    { title: "Level Gift", sparks: 50, body: "Nice progress!" },
  ];
  const {
    enabled: chainEnabled,
    claim,
    commitProgress,
    isPending,
    address: playerAddress,
  } = useChainEconomy();

  useEffect(() => {
    if (!open) {
      setPhase("celebrate");
      setRewardIdx(0);
      setErr(null);
      return;
    }
    setPhase(startAtMap ? "map" : "celebrate");
  }, [open, completedLevel, nextLevel, startAtMap]);

  /** Brief congrats, then open the kingdom map */
  useEffect(() => {
    if (!open || phase !== "celebrate") return;
    const t = window.setTimeout(() => setPhase("map"), 3200);
    return () => window.clearTimeout(t);
  }, [open, phase]);

  if (!open) return null;

  const finishAndAdvance = async () => {
    if (chainEnabled && playerAddress) {
      try {
        await commitProgress(nextLevel);
      } catch {
        /* settings can retry */
      }
    }
    confirmLevelAdvance();
    setPhase("done");
    onFinished();
  };

  const claimGift = async () => {
    const gift = gifts[rewardIdx];
    if (!gift) return;
    setErr(null);
    setBusy(true);
    try {
      if (chainEnabled) {
        if (!playerAddress) {
          setErr("Sign in first so Paintadom can use your wallet.");
          return;
        }
        const tx = await claim(gift.sparks, "level_up");
        if (!tx || !("hash" in tx) || !tx.hash) {
          setErr(
            ("error" in tx && tx.error) || "Sign & claim failed — try again."
          );
          return;
        }
      } else {
        buySparks(gift.sparks);
      }

      if (rewardIdx + 1 < gifts.length) {
        setRewardIdx((i) => i + 1);
        return;
      }

      await finishAndAdvance();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setErr(
        /reject|denied|cancel/i.test(msg)
          ? "Signature cancelled in wallet."
          : "Sign & claim failed — try again."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {phase === "celebrate" && (
        <motion.div
          key="celebrate"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.7, rotate: -6 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 16 }}
            className="relative w-full max-w-sm overflow-hidden rounded-[1.75rem] border-4 border-white p-6 text-center"
            style={{
              background:
                "linear-gradient(160deg, #fef08a 0%, #f472b6 45%, #a78bfa 100%)",
              boxShadow:
                "0 0 40px rgba(250,204,21,0.7), 0 0 80px rgba(244,114,182,0.5), 0 12px 0 #7c3aed",
            }}
          >
            <motion.div
              className="pointer-events-none absolute inset-0"
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              style={{
                background:
                  "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.55), transparent 55%)",
              }}
            />
            <GameIcon
              src="/icons/crown.webp"
              size={64}
              className="relative mx-auto"
            />
            <h2
              className="relative mt-3 font-display text-3xl font-black text-white"
              style={{ textShadow: "0 4px 0 rgba(0,0,0,0.35)" }}
            >
              Level {completedLevel} Completed!
            </h2>
            <p className="relative mt-2 text-sm font-bold text-white/95">
              {gallery.name} is full — amazing work!
            </p>
            <p className="relative mt-2 text-xs font-bold text-white/90">
              Opening the kingdom map…
            </p>
          </motion.div>
        </motion.div>
      )}

      {phase === "rewards" && gifts[rewardIdx] && (
        <motion.div
          key={`reward-${rewardIdx}`}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ y: 40, scale: 0.9 }}
            animate={{ y: 0, scale: 1 }}
            className="w-full max-w-sm rounded-[1.75rem] border-4 border-white bg-gradient-to-b from-amber-200 to-orange-400 p-5 text-center shadow-[0_10px_0_#c2410c]"
          >
            <GameIcon src="/icons/gift.webp" size={72} className="mx-auto" />
            <h3 className="mt-2 font-display text-2xl font-black text-amber-950">
              Level {nextLevel} Gift
            </h3>
            <p className="mt-1 text-xs font-bold text-amber-900/70">
              Gift {rewardIdx + 1} of {gifts.length}
            </p>
            <p className="mt-1 font-display text-lg font-black text-orange-800">
              {gifts[rewardIdx].title}
            </p>
            <p className="mt-1 text-sm font-bold text-amber-950/80">
              {gifts[rewardIdx].body}
            </p>
            <p className="mt-3 flex items-center justify-center gap-1 font-display text-xl font-black text-amber-950">
              <GameIcon src="/icons/sparks.webp" size={28} />+
              {gifts[rewardIdx].sparks} Sparks
            </p>
            {err && (
              <p className="mt-2 text-xs font-bold text-red-700">{err}</p>
            )}
            <button
              type="button"
              disabled={busy || isPending}
              onClick={() => void claimGift()}
              className="btn-lime mt-4 w-full disabled:opacity-60"
            >
              {busy || isPending
                ? "Confirm in wallet…"
                : chainEnabled
                  ? "Sign & claim"
                  : "Claim"}
            </button>
          </motion.div>
        </motion.div>
      )}

      {phase === "map" && (
        <LevelMapPopup
          key="map"
          open
          playerLevel={completedLevel}
          tapToContinueLevel={nextLevel}
          onTapContinue={() => {
            setRewardIdx(0);
            setErr(null);
            setPhase("rewards");
          }}
          dismissable={false}
        />
      )}
    </AnimatePresence>
  );
}

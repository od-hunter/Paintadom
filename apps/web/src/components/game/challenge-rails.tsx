"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "@/store/game-store";
import {
  AD_SPARK_TIERS,
  CHALLENGE_HUBS,
  getAdVideo,
  type ChallengeHub,
  type ChallengeId,
} from "@/data/challenges";
import { GameIcon } from "@/components/ui/game-icon";
import {
  formatRailCountdown,
  formatFullCountdown,
} from "@/lib/format-countdown";

import { CenteredModal } from "@/components/ui/centered-modal";
import { SpinPanel } from "@/components/game/spin-panel";
import { StreakPanel } from "@/components/game/streak-panel";
import { PuzzlePanel } from "@/components/game/puzzle-panel";
import { TournamentPanel } from "@/components/game/tournament-panel";
import { VideoWatchPlayer } from "@/components/game/video-watch-player";
import { playSfx } from "@/lib/audio";
import { useAccount } from "wagmi";
import { useChainEconomy } from "@/hooks/use-chain-economy";

function ModalShell({
  open,
  onClose,
  title,
  children,
  accent = "from-violet-400 to-fuchsia-500",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <CenteredModal open={open} onClose={onClose} zIndex={90}>
      <div className="flex max-h-[min(86dvh,640px)] flex-col overflow-hidden rounded-[1.75rem] border-4 border-white bg-gradient-to-b from-white to-slate-50 shadow-[0_12px_0_rgba(0,0,0,0.25)]">
        <div
          className={`relative shrink-0 bg-gradient-to-r ${accent} px-4 py-3 text-center`}
        >
          <h2
            className="font-display text-xl font-black text-white"
            style={{ textShadow: "0 2px 0 rgba(0,0,0,0.3)" }}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-red-500 text-lg font-black text-white"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-5">
          {children}
        </div>
      </div>
    </CenteredModal>
  );
}

function AdsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const watchAd = useGameStore((s) => s.watchAd);
  const adsWatchedToday = useGameStore((s) => s.adsWatchedToday);
  const artDiscountPct = useGameStore((s) => s.artDiscountPct);
  const artDiscountUntil = useGameStore((s) => s.artDiscountUntil);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const [toast, setToast] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [claimBusy, setClaimBusy] = useState(false);
  const { isConnected } = useAccount();
  const { enabled: chainEnabled, claim, isPending, address: playerAddress } =
    useChainEconomy();

  useEffect(() => {
    if (!open) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [open]);

  const discountActive = artDiscountPct > 0 && artDiscountUntil > now;
  const minsLeft = Math.max(0, Math.ceil((artDiscountUntil - now) / 60_000));
  const nextIdx = adsWatchedToday;
  const remaining = Math.max(0, AD_SPARK_TIERS.length - adsWatchedToday);

  const finishVideoClaim = async () => {
    const idx = useGameStore.getState().adsWatchedToday;
    if (idx >= AD_SPARK_TIERS.length) {
      setPlayingIndex(null);
      setToast("Come back in 24 hours for more videos!");
      return;
    }
    const sparks = AD_SPARK_TIERS[idx];
    setClaimBusy(true);
    try {
      if (chainEnabled) {
        if (!playerAddress) {
          setToast("Sign in first so Paintadom can use your wallet.");
          return;
        }
        const tx = await claim(sparks, "video");
        if (!tx || !("hash" in tx) || !tx.hash) {
          setToast(
            ("error" in tx && tx.error) || "Claim cancelled or failed."
          );
          return;
        }
        const res = watchAd({ skipSparks: true });
        setPlayingIndex(null);
        if (!res) {
          setToast("Come back in 24 hours for more videos!");
          return;
        }
        playSfx("claim", soundEnabled);
        setToast(
          res.discount
            ? `+${res.sparks} Sparks on-chain · ${res.discount.pct}% art discount!`
            : `+${res.sparks} Sparks claimed on Celo!`
        );
        return;
      }

      const res = watchAd();
      setPlayingIndex(null);
      if (!res) {
        setToast("Come back in 24 hours for more videos!");
        return;
      }
      playSfx("claim", soundEnabled);
      setToast(
        res.discount
          ? `+${res.sparks} Sparks · ${res.discount.pct}% art discount unlocked!`
          : `+${res.sparks} Sparks earned!`
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setToast(
        /reject|denied|cancel/i.test(msg)
          ? "Signature cancelled in wallet."
          : "On-chain claim failed. Try again."
      );
    } finally {
      setClaimBusy(false);
    }
  };

  return (
    <>
      <ModalShell open={open} onClose={onClose} title="Videos" accent="from-sky-400 to-blue-600">
        <p className="text-center text-sm font-bold text-slate-800">
          Tap a video to play. Watch it to the end ({/* */}
          <span className="font-black">30s / 45s / 60s</span>) to earn Sparks.
          Limit: <span className="font-black">8 per 24 hours</span>.
        </p>
        {discountActive && (
          <p className="mt-2 rounded-xl bg-lime-100 px-3 py-2 text-center text-xs font-black text-emerald-800">
            {artDiscountPct}% off gallery arts · {minsLeft}m left
          </p>
        )}
        <p className="mt-2 text-center text-xs font-black text-slate-600">
          {remaining}/8 videos left today
        </p>
        <div className="mt-3 space-y-2">
          {AD_SPARK_TIERS.map((sparks, i) => {
            const done = i < adsWatchedToday;
            const current = i === nextIdx;
            const locked = i > nextIdx;
            const v = getAdVideo(i);
            return (
              <button
                key={i}
                type="button"
                disabled={!current}
                onClick={() => {
                  if (!current) return;
                  playSfx("tap", soundEnabled);
                  setPlayingIndex(i);
                }}
                className={`flex w-full items-center gap-3 rounded-2xl border-2 px-3 py-2.5 text-left transition active:scale-[0.99] ${
                  done
                    ? "border-emerald-300 bg-emerald-50 opacity-80"
                    : current
                      ? "border-blue-500 bg-blue-50 shadow-[0_3px_0_#2563eb]"
                      : "border-slate-200 bg-slate-50 opacity-55"
                }`}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center">
                  {done ? (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-sm font-black text-white">
                      ✓
                    </span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src="/icons/play.svg"
                      alt=""
                      className="h-10 w-10 object-contain drop-shadow"
                    />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black text-slate-900">
                    Video {i + 1}
                    {v.unlocksDiscount ? " · Discount!" : ""}
                  </span>
                  <span className="block text-[11px] font-bold text-slate-600">
                    {done
                      ? "Completed"
                      : locked
                        ? "Locked — finish earlier videos first"
                        : `Tap to play · ${v.durationSec}s`}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-sm font-black text-amber-700">
                  <GameIcon src="/icons/sparks.webp" size={18} />+{sparks}
                </span>
              </button>
            );
          })}
        </div>
        {toast && (
          <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-center text-sm font-black text-emerald-800">
            {toast}
          </p>
        )}
      </ModalShell>

      <VideoWatchPlayer
        open={playingIndex != null}
        videoIndex={playingIndex ?? 0}
        onClose={() => {
          if (!claimBusy && !isPending) setPlayingIndex(null);
        }}
        onCompleted={() => {
          void finishVideoClaim();
        }}
      />
    </>
  );
}

function DailyPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dailyRewards = useGameStore((s) => s.dailyRewards);
  const lastDailyClaimDay = useGameStore((s) => s.lastDailyClaimDay);
  const lastDailyClaimDate = useGameStore((s) => s.lastDailyClaimDate);
  const dailyCooldownUntil = useGameStore((s) => s.dailyCooldownUntil);
  const claimDailyReward = useGameStore((s) => s.claimDailyReward);
  const [msg, setMsg] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const today = new Date().toISOString().slice(0, 10);
  const claimedToday = lastDailyClaimDate === today || dailyCooldownUntil > now;
  const nextDay = lastDailyClaimDay + 1;

  useEffect(() => {
    if (!open) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [open]);

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const calNow = new Date();
  const coolLeft = Math.max(0, dailyCooldownUntil - now);

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Daily Calendar"
      accent="from-amber-400 to-orange-600"
    >
      {/* 3D calendar board */}
      <div
        className="relative overflow-hidden rounded-[1.5rem] border-[4px] border-[#fbbf24] p-3"
        style={{
          background:
            "linear-gradient(165deg, #fff7ed 0%, #fdba74 45%, #fb923c 100%)",
          boxShadow:
            "0 10px 0 #c2410c, inset 0 2px 0 rgba(255,255,255,0.65), inset 0 -3px 0 rgba(154,52,18,0.25)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent, transparent 14px, rgba(255,255,255,0.12) 14px, rgba(255,255,255,0.12) 15px)",
          }}
        />
        <div className="relative text-center">
          <p
            className="font-display text-lg font-black text-amber-950"
            style={{ textShadow: "0 2px 0 rgba(255,255,255,0.5)" }}
          >
            {calNow.toLocaleString("en", { month: "long", year: "numeric" })}
          </p>
          <p className="mt-0.5 text-[11px] font-black uppercase tracking-wider text-amber-900/80">
            7-day login calendar
          </p>
        </div>

        <div className="relative mt-3 grid grid-cols-7 gap-1.5">
          {dailyRewards.map((r) => {
            const canClaim = !claimedToday && !r.claimed && r.day === nextDay;
            const isPast = r.claimed;
            const isFuture = r.day > nextDay;
            const weekday =
              weekdays[(calNow.getDay() - (nextDay - r.day) + 7) % 7] ?? `D${r.day}`;

            return (
              <motion.button
                key={r.day}
                type="button"
                disabled={!canClaim}
                whileTap={canClaim ? { scale: 0.92, y: 2 } : undefined}
                animate={
                  canClaim
                    ? {
                        y: [0, -3, 0],
                        boxShadow: [
                          "0 5px 0 #b45309",
                          "0 7px 0 #b45309",
                          "0 5px 0 #b45309",
                        ],
                      }
                    : undefined
                }
                transition={
                  canClaim
                    ? { repeat: Infinity, duration: 1.4, ease: "easeInOut" }
                    : undefined
                }
                onClick={() => {
                  const got = claimDailyReward(r.day);
                  if (got != null) {
                    const g = Math.max(1, Math.round(got / 25));
                    setMsg(`Day ${r.day} claimed! +${got} Sparks · +${g} G$`);
                  } else if (claimedToday) {
                    setMsg("Only 1 claim per day");
                  }
                }}
                className={`relative flex aspect-[3/4] flex-col items-center justify-between overflow-hidden rounded-xl border-[2.5px] px-0.5 pb-1 pt-1 ${
                  isPast
                    ? "border-emerald-500 bg-gradient-to-b from-emerald-200 to-emerald-400 shadow-[0_4px_0_#047857]"
                    : canClaim
                      ? "border-yellow-300 bg-gradient-to-b from-yellow-200 via-amber-300 to-orange-400 shadow-[0_5px_0_#b45309] ring-2 ring-white/70"
                      : isFuture
                        ? "border-amber-200/80 bg-gradient-to-b from-white/90 to-amber-100/80 opacity-70 shadow-[0_3px_0_#d97706]"
                        : "border-amber-300 bg-gradient-to-b from-white to-amber-100 shadow-[0_3px_0_#d97706]"
                }`}
              >
                <span className="text-[7px] font-black uppercase text-amber-950/70">
                  {weekday}
                </span>
                <span
                  className="font-display text-base font-black text-amber-950"
                  style={{ textShadow: "0 1px 0 rgba(255,255,255,0.6)" }}
                >
                  {r.day}
                </span>
                {isPast ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-600 text-[10px] font-black text-white shadow">
                    ✓
                  </span>
                ) : (
                  <span className="flex flex-col items-center">
                    <GameIcon src="/icons/sparks.webp" size={14} />
                    <span className="text-[8px] font-black text-amber-950">
                      {r.sparks}
                    </span>
                  </span>
                )}
                {canClaim && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-red-500 text-[8px] font-black text-white">
                    !
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      <div
        className="mt-3 rounded-2xl border-2 border-orange-300 px-3 py-2.5 text-center"
        style={{
          background: "linear-gradient(180deg,#fff7ed,#ffedd5)",
          boxShadow: "0 4px 0 #ea580c",
        }}
      >
        <p className="text-[11px] font-black uppercase tracking-wide text-orange-800">
          Next claimable
        </p>
        <p className="mt-0.5 font-display text-lg font-black text-amber-950">
          {nextDay <= 7 && !claimedToday
            ? `Day ${nextDay}`
            : claimedToday
              ? coolLeft > 0
                ? formatFullCountdown(coolLeft)
                : "Tomorrow"
              : "Calendar complete"}
        </p>
      </div>
      {msg && (
        <p className="mt-2 text-center text-sm font-black text-emerald-700">
          {msg}
        </p>
      )}
    </ModalShell>
  );
}


/** Countdown lives in its own component so the 1s tick never re-renders icons. */
const RailCountdown = memo(function RailCountdown({
  until,
}: {
  until: number;
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (until <= Date.now()) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [until]);

  if (until <= now) return null;
  return (
    <span className="mt-0.5 max-w-[4.4rem] rounded-md bg-black/75 px-1 py-0.5 text-center text-[7px] font-black leading-tight text-amber-200">
      {formatRailCountdown(until - now)}
    </span>
  );
});

/** Stable icon plate — memoized so store ticks / badges don't remount images. */
const RailIconPlate = memo(function RailIconPlate({
  hub,
}: {
  hub: ChallengeHub;
}) {
  return (
    <span
      className={`rail-icon flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-white bg-gradient-to-b shadow-[0_5px_0_var(--sh)] ${hub.gradient}`}
      style={{ ["--sh" as string]: hub.shadow }}
    >
      {hub.id === "ads" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/icons/play.svg"
          alt=""
          width={42}
          height={42}
          className="pointer-events-none select-none object-contain"
          style={{
            width: 42,
            height: 42,
            background: "transparent",
          }}
          draggable={false}
          decoding="async"
        />
      ) : (
        <GameIcon src={hub.icon} size={44} />
      )}
    </span>
  );
});

const RailButton = memo(function RailButton({
  hub,
  badge,
  cooldownUntil,
  shake,
  onOpen,
}: {
  hub: ChallengeHub;
  badge: string | null;
  cooldownUntil: number;
  shake: boolean;
  onOpen: (id: ChallengeId) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(hub.id)}
      className={`relative flex w-[4.1rem] flex-col items-center ${
        shake ? "rail-shake" : ""
      }`}
      aria-label={hub.title}
    >
      <RailIconPlate hub={hub} />
      {badge && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[9px] font-black leading-none text-white">
          {badge}
        </span>
      )}
      <span className="mt-0.5 max-w-[4.1rem] truncate rounded-md bg-black/55 px-1 text-[9px] font-black text-white">
        {hub.title.split(" ")[0]}
      </span>
      <RailCountdown until={cooldownUntil} />
    </button>
  );
});

/** Distinct challenge buttons + their popups for the home HUD */
export function ChallengeRails() {
  const [active, setActive] = useState<ChallengeId | null>(null);
  const [shakeOn, setShakeOn] = useState(true);
  /** Slow tick only for badge/ready flags — not every icon paint */
  const [readyTick, setReadyTick] = useState(0);

  const artDiscountUntil = useGameStore((s) => s.artDiscountUntil);
  const artDiscountPct = useGameStore((s) => s.artDiscountPct);
  const puzzlePoints = useGameStore((s) => s.puzzlePoints);
  const dailyRewards = useGameStore((s) => s.dailyRewards);
  const lastDailyClaimDay = useGameStore((s) => s.lastDailyClaimDay);
  const lastDailyClaimDate = useGameStore((s) => s.lastDailyClaimDate);
  const streak = useGameStore((s) => s.streak);
  const streakClaimUntil = useGameStore((s) => s.streakClaimUntil);
  const spinCooldownUntil = useGameStore((s) => s.spinCooldownUntil);
  const pendingSpin = useGameStore((s) => s.pendingSpin);
  const dailyCooldownUntil = useGameStore((s) => s.dailyCooldownUntil);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const t = window.setInterval(() => setReadyTick((n) => n + 1), 5000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    let stopTimer: number | undefined;
    const startShake = () => {
      setShakeOn(true);
      stopTimer = window.setTimeout(() => setShakeOn(false), 2_000);
    };
    startShake();
    const loop = window.setInterval(startShake, 22_000);
    return () => {
      window.clearInterval(loop);
      if (stopTimer) window.clearTimeout(stopTimer);
    };
  }, []);

  const left = useMemo(
    () => CHALLENGE_HUBS.filter((h) => h.side === "left"),
    []
  );
  const right = useMemo(
    () => CHALLENGE_HUBS.filter((h) => h.side === "right"),
    []
  );

  void readyTick;
  const now = Date.now();
  const dailyReady =
    dailyCooldownUntil <= now &&
    lastDailyClaimDate !== today &&
    dailyRewards.some(
      (r) => !r.claimed && r.day === lastDailyClaimDay + 1
    );
  const discountLive = artDiscountPct > 0 && artDiscountUntil > now;
  const streakReady = streak >= 1 && streakClaimUntil <= now;

  const badgeFor = (id: ChallengeId): string | null => {
    if (id === "daily" && dailyReady) return "•••";
    if (id === "ads" && discountLive) return `${artDiscountPct}%`;
    if (id === "puzzle" && puzzlePoints >= 8) return String(puzzlePoints);
    if (id === "streak" && streakReady) return "•••";
    if (id === "spin" && pendingSpin) return "•••";
    return null;
  };

  const cooldownFor = (id: ChallengeId): number => {
    if (id === "spin" && !pendingSpin) return spinCooldownUntil;
    if (id === "streak" && !streakReady) return streakClaimUntil;
    if (id === "daily") return dailyCooldownUntil;
    return 0;
  };

  const shouldShake = (id: ChallengeId) =>
    shakeOn &&
    ((id === "streak" && streakReady) ||
      (id === "spin" && !!pendingSpin) ||
      (id === "daily" && dailyReady));

  const openHub = useCallback((id: ChallengeId) => setActive(id), []);

  const Rail = ({ hubs }: { hubs: ChallengeHub[] }) => (
    <div className="flex flex-col gap-2.5">
      {hubs.map((h) => (
        <RailButton
          key={h.id}
          hub={h}
          badge={badgeFor(h.id)}
          cooldownUntil={cooldownFor(h.id)}
          shake={shouldShake(h.id)}
          onOpen={openHub}
        />
      ))}
    </div>
  );

  return (
    <>
      <div className="absolute left-1.5 top-[5.25rem] z-30">
        <Rail hubs={left} />
      </div>
      <div className="absolute right-1.5 top-[5.25rem] z-30">
        <Rail hubs={right} />
      </div>

      <AdsPanel open={active === "ads"} onClose={() => setActive(null)} />
      <DailyPanel open={active === "daily"} onClose={() => setActive(null)} />
      <PuzzlePanel open={active === "puzzle"} onClose={() => setActive(null)} />
      <TournamentPanel
        open={active === "tournament"}
        onClose={() => setActive(null)}
      />
      <SpinPanel open={active === "spin"} onClose={() => setActive(null)} />
      <StreakPanel open={active === "streak"} onClose={() => setActive(null)} />
    </>
  );
}

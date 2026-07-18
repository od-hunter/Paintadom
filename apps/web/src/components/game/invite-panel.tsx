"use client";

import { useMemo, useState } from "react";
import { useGameStore } from "@/store/game-store";
import { CenteredModal } from "@/components/ui/centered-modal";
import { GameIcon } from "@/components/ui/game-icon";
import { playSfx } from "@/lib/audio";

function inviteRewards(count: number) {
  // Preview next reward tier
  const n = count + 1;
  return {
    sparks: Math.max(15, 80 - (n - 1) * 8),
    gDollars: Math.max(1, 6 - Math.floor((n - 1) / 2)),
  };
}

export function InvitePanel({
  open,
  onClose,
  onBack,
}: {
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
}) {
  const playerId = useGameStore((s) => s.playerId);
  const inviteCount = useGameStore((s) => s.inviteCount);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const registerInviteSuccess = useGameStore((s) => s.registerInviteSuccess);
  const [copied, setCopied] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const link = useMemo(() => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://paintadom.app";
    const ref = playerId || "GUEST";
    return `${origin}/?ref=${encodeURIComponent(ref)}`;
  }, [playerId]);

  const next = inviteRewards(inviteCount);

  return (
    <CenteredModal open={open} onClose={onClose} zIndex={95}>
      <div className="flex max-h-[min(90dvh,640px)] w-full flex-col overflow-hidden rounded-[1.85rem] border-[5px] border-white bg-gradient-to-b from-emerald-300 via-teal-400 to-cyan-700 shadow-[0_14px_0_rgba(0,0,0,0.28)]">
        <div className="relative shrink-0 px-4 pb-2 pt-4 text-center">
          <h2
            className="font-display text-2xl font-black uppercase text-white"
            style={{ textShadow: "0 3px 0 rgba(0,0,0,0.35)" }}
          >
            Invite Friends
          </h2>
          <button
            type="button"
            onClick={onBack ?? onClose}
            className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white bg-teal-600 text-lg font-black text-white"
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
          <p className="rounded-xl bg-black/20 px-3 py-2 text-center text-sm font-bold leading-snug text-white">
            Share your link. Each friend who joins earns you{" "}
            <span className="font-black">Sparks</span> and{" "}
            <span className="font-black">G$</span>. Rewards change with how many
            people you invite.
          </p>

          <div className="rounded-2xl border-[3px] border-white bg-white p-3 shadow-[0_5px_0_rgba(0,0,0,0.2)]">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
              Your invite link
            </p>
            <p className="mt-1 break-all font-mono text-xs font-bold leading-snug text-slate-900">
              {link}
            </p>
            <button
              type="button"
              onClick={async () => {
                playSfx("tap", soundEnabled);
                try {
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2000);
                } catch {
                  setFlash("Copy failed — select the link manually");
                }
              }}
              className="btn-lime mt-3 w-full"
            >
              {copied ? "Copied!" : "Copy invite link"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border-[3px] border-white bg-white/95 px-3 py-3 text-center">
              <p className="text-[10px] font-black uppercase text-slate-500">
                Friends invited
              </p>
              <p className="font-display text-2xl font-black text-slate-900">
                {inviteCount}
              </p>
            </div>
            <div className="rounded-2xl border-[3px] border-white bg-white/95 px-3 py-3 text-center">
              <p className="text-[10px] font-black uppercase text-slate-500">
                Next reward
              </p>
              <p className="mt-1 flex items-center justify-center gap-1 text-sm font-black text-amber-800">
                <GameIcon src="/icons/sparks.webp" size={16} />+{next.sparks}
              </p>
              <p className="text-xs font-black text-violet-800">
                +{next.gDollars} G$
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playSfx("claim", soundEnabled);
              const got = registerInviteSuccess();
              if (got) {
                setFlash(
                  `Friend joined! +${got.sparks} Sparks · +${got.gDollars} G$`
                );
              }
            }}
            className="w-full rounded-2xl border-[3px] border-dashed border-white/80 bg-black/15 py-3 text-sm font-black text-white"
          >
            Simulate friend join (demo)
          </button>

          {flash && (
            <p className="rounded-xl bg-emerald-100 px-3 py-2 text-center text-sm font-black text-emerald-900">
              {flash}
            </p>
          )}
        </div>
      </div>
    </CenteredModal>
  );
}

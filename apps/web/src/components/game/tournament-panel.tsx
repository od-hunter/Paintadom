"use client";

import { useState } from "react";
import { useGameStore } from "@/store/game-store";
import { TOURNAMENTS } from "@/data/challenges";
import { GameIcon } from "@/components/ui/game-icon";
import { CenteredModal } from "@/components/ui/centered-modal";

export function TournamentPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const joinTournament = useGameStore((s) => s.joinTournament);
  const claimTournamentPrize = useGameStore((s) => s.claimTournamentPrize);
  const tournamentJoined = useGameStore((s) => s.tournamentJoined);
  const tournamentScore = useGameStore((s) => s.tournamentScore);
  const pagesCompletedToday = useGameStore((s) => s.pagesCompletedToday);
  const username = useGameStore((s) => s.username);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <CenteredModal open={open} onClose={onClose} zIndex={90}>
      <div className="flex max-h-[min(86dvh,640px)] w-full flex-col overflow-hidden rounded-[1.75rem] border-4 border-white bg-white shadow-[0_12px_0_rgba(0,0,0,0.25)]">
        <div className="relative shrink-0 bg-gradient-to-r from-violet-400 to-indigo-600 px-4 py-3 text-center">
          <h2
            className="font-display text-xl font-black text-white"
            style={{ textShadow: "0 2px 0 rgba(0,0,0,0.3)" }}
          >
            Tournaments
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-red-500 text-lg font-black text-white"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          <p className="text-center text-sm font-black text-slate-800">
            Compete daily & weekly — win Sparks, puzzle points, and moves.
          </p>
          {TOURNAMENTS.map((t) => {
            const joined = !!tournamentJoined[t.id];
            const score =
              tournamentScore[t.id] ??
              (t.kind === "daily" ? pagesCompletedToday * 30 : 0);
            return (
              <div
                key={t.id}
                className="rounded-2xl border-2 border-violet-200 bg-white p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-base font-black text-slate-900">
                      {t.title}
                    </p>
                    <p className="text-[11px] font-bold text-slate-600">
                      {t.blurb}
                    </p>
                  </div>
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-black uppercase text-violet-700">
                    {t.kind}
                  </span>
                </div>
                <div className="relative mt-3 h-16 overflow-hidden rounded-xl bg-gradient-to-b from-lime-300 to-green-500">
                  <div className="absolute inset-x-4 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-emerald-800/40" />
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-yellow-300 bg-blue-500"
                      style={{ left: `${12 + i * 24}%` }}
                    />
                  ))}
                  <div className="absolute right-3 top-1.5">
                    <GameIcon src="/icons/gift.webp" size={28} />
                  </div>
                  <p className="absolute bottom-1 left-2 text-[9px] font-black text-white">
                    {username || "You"} · score {score}
                  </p>
                </div>
                {!joined ? (
                  <button
                    type="button"
                    onClick={() => {
                      const res = joinTournament(t.id);
                      setMsg(
                        res.ok
                          ? `Joined ${t.title}!`
                          : res.reason ?? "Can't join"
                      );
                    }}
                    className="mt-2 w-full rounded-xl border-b-4 border-indigo-800 bg-gradient-to-b from-violet-300 to-indigo-500 py-2 text-sm font-black text-white"
                  >
                    {t.entryCost > 0
                      ? `Join · ${t.entryCost} Sparks`
                      : "Join free"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const place = score >= 100 ? 1 : score >= 40 ? 2 : 3;
                      const ok = claimTournamentPrize(t.id, place);
                      setMsg(
                        ok
                          ? `Claimed place #${place} rewards!`
                          : "Already claimed or keep painting!"
                      );
                    }}
                    className="mt-2 w-full rounded-xl border-b-4 border-amber-700 bg-gradient-to-b from-amber-300 to-orange-500 py-2 text-sm font-black text-white"
                  >
                    Claim rewards
                  </button>
                )}
              </div>
            );
          })}
          {msg && (
            <p className="text-center text-sm font-black text-emerald-700">
              {msg}
            </p>
          )}
        </div>
      </div>
    </CenteredModal>
  );
}

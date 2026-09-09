"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/store/game-store";
import { CenteredModal } from "@/components/ui/centered-modal";
import {
  playSfx,
  setMusicEnabled,
  unlockAudio,
} from "@/lib/audio";
import { useOnChainClaim } from "@/hooks/use-on-chain-claim";
import { WalletModal } from "@/components/game/wallet-modal";
import { useAccount, useChainId } from "wagmi";
import { celo, celoSepolia } from "viem/chains";

const LANGS = [
  { id: "en", label: "ENGLISH" },
  { id: "es", label: "ESPAÑOL" },
  { id: "fr", label: "FRANÇAIS" },
] as const;

function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative h-9 w-16 shrink-0 rounded-full border-[3px] border-white shadow-[0_3px_0_rgba(0,0,0,0.2)] transition ${
        on
          ? "bg-gradient-to-b from-lime-300 to-green-500"
          : "bg-gradient-to-b from-slate-300 to-slate-500"
      }`}
    >
      <span
        className={`absolute top-0.5 h-7 w-7 rounded-full border-2 border-white bg-white shadow transition ${
          on ? "left-7" : "left-0.5"
        }`}
      />
    </button>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border-[3px] border-white/50 bg-white/25 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-white bg-gradient-to-b from-sky-200 to-sky-500 text-xl shadow">
        {icon}
      </span>
      <span
        className="min-w-0 flex-1 font-display text-sm font-black uppercase tracking-wide text-white"
        style={{ textShadow: "0 2px 0 rgba(0,0,0,0.35)" }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function CeloChainSettings({ soundEnabled }: { soundEnabled: boolean }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { enabled, claim, commitProgress, isPending, error, lastTx } =
    useOnChainClaim();
  const mergeOnChainSparks = useGameStore((s) => s.mergeOnChainSparks);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!enabled) return null;

  const network =
    chainId === celoSepolia.id
      ? "Celo Sepolia"
      : chainId === celo.id
        ? "Celo"
        : `Chain ${chainId}`;

  const syncBalance = async () => {
    if (!address) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch(
        `/api/chain/balance?address=${address}&chainId=${chainId}`
      );
      const data = (await res.json()) as {
        sparkBalance?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Sync failed");
      const delta = mergeOnChainSparks(Number(data.sparkBalance || 0));
      setStatus(
        delta > 0
          ? `Synced +${delta} Sparks`
          : `Balance ${data.sparkBalance} on-chain`
      );
      playSfx("claim", soundEnabled);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 rounded-2xl border-[3px] border-white/50 bg-white/20 p-3">
      <p
        className="font-display text-sm font-black uppercase text-white"
        style={{ textShadow: "0 2px 0 rgba(0,0,0,0.35)" }}
      >
        Celo · PaintadomGame
      </p>
      <p className="text-[11px] font-bold text-white/90">
        {network}
        {isConnected && address
          ? ` · ${address.slice(0, 6)}…${address.slice(-4)}`
          : " · wallet offline"}
      </p>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={busy || !address}
          onClick={() => void syncBalance()}
          className="rounded-xl border-2 border-white bg-sky-600 py-2 text-xs font-black text-white disabled:opacity-50"
        >
          Sync Sparks from chain
        </button>
        <button
          type="button"
          disabled={isPending || !address}
          onClick={() => {
            void commitProgress()
              .then((r) => {
                if (r && "hash" in r && r.hash) {
                  setStatus("Level progress committed on-chain");
                  playSfx("claim", soundEnabled);
                } else if (r && "error" in r) {
                  setStatus(r.error);
                }
              })
              .catch((e) =>
                setStatus(e instanceof Error ? e.message : "Commit failed")
              );
          }}
          className="rounded-xl border-2 border-white bg-violet-600 py-2 text-xs font-black text-white disabled:opacity-50"
        >
          Commit level on-chain
        </button>
        <button
          type="button"
          disabled={isPending || !address}
          onClick={() => {
            void claim(25, "manual")
              .then((r) => {
                if (r && "hash" in r && r.hash) {
                  setStatus("Claimed +25 Sparks on-chain");
                  playSfx("claim", soundEnabled);
                } else if (r && "error" in r) {
                  setStatus(r.error);
                }
              })
              .catch((e) =>
                setStatus(e instanceof Error ? e.message : "Claim failed")
              );
          }}
          className="rounded-xl border-2 border-white bg-amber-500 py-2 text-xs font-black text-amber-950 disabled:opacity-50"
        >
          Test claim (+25 Sparks)
        </button>
      </div>
      {(status || error) && (
        <p className="text-center text-[11px] font-bold text-white">
          {error || status}
        </p>
      )}
      {lastTx && (
        <p className="truncate text-center text-[10px] font-bold text-white/80">
          tx {lastTx.slice(0, 10)}…
        </p>
      )}
    </div>
  );
}

export function SettingsPanel({
  open,
  onClose,
  onBack,
}: {
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
}) {
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const musicEnabled = useGameStore((s) => s.musicEnabled);
  const language = useGameStore((s) => s.language);
  const playerId = useGameStore((s) => s.playerId);
  const setSound = useGameStore((s) => s.setSoundEnabled);
  const setMusic = useGameStore((s) => s.setMusicEnabled);
  const setLanguage = useGameStore((s) => s.setLanguage);
  const resetGame = useGameStore((s) => s.resetGame);
  const [confirmReset, setConfirmReset] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    void unlockAudio();
  }, [open]);

  const langIdx = Math.max(
    0,
    LANGS.findIndex((l) => l.id === language)
  );
  const lang = LANGS[langIdx] ?? LANGS[0];

  return (
    <CenteredModal open={open} onClose={onClose} zIndex={95}>
      <div
        className="flex max-h-[min(90dvh,720px)] w-full flex-col overflow-hidden rounded-[1.85rem] border-[5px] border-white shadow-[0_14px_0_rgba(0,0,0,0.28)]"
        style={{
          background:
            "linear-gradient(180deg, #7dd3fc 0%, #38bdf8 40%, #0284c7 100%)",
        }}
      >
        <div className="relative shrink-0 px-4 pb-2 pt-4 text-center">
          <h2
            className="font-display text-3xl font-black uppercase tracking-wide text-white"
            style={{ textShadow: "0 3px 0 rgba(0,0,0,0.35)" }}
          >
            Settings
          </h2>
          <button
            type="button"
            onClick={onBack ?? onClose}
            className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white bg-sky-500 text-lg font-black text-white shadow"
            aria-label="Back"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white bg-red-500 text-xl font-black text-white shadow"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 pb-5">
          <Row icon="🔊" label="Sound Effects">
            <Toggle
              on={soundEnabled}
              onChange={(v) => {
                setSound(v);
                if (v) playSfx("tap", true);
              }}
            />
          </Row>
          <Row icon="🎵" label="Music">
            <Toggle
              on={musicEnabled}
              onChange={(v) => {
                setMusic(v);
                setMusicEnabled(v);
                if (v) void unlockAudio().then(() => setMusicEnabled(true));
              }}
            />
          </Row>
          <Row icon="🌐" label="Language">
            <button
              type="button"
              onClick={() => {
                playSfx("tap", soundEnabled);
                const next = LANGS[(langIdx + 1) % LANGS.length];
                setLanguage(next.id);
              }}
              className="rounded-full border-[3px] border-white bg-gradient-to-b from-amber-200 to-amber-500 px-4 py-1.5 font-display text-xs font-black text-amber-950 shadow-[0_3px_0_#b45309]"
            >
              {lang.label}
            </button>
          </Row>

          <div className="my-2 h-1 rounded-full bg-white/40" />

          <button
            type="button"
            onClick={() => {
              playSfx("tap", soundEnabled);
              setWalletModalOpen(true);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-[3px] border-white bg-gradient-to-b from-violet-300 to-purple-700 py-3 font-display text-base font-black text-white shadow-[0_5px_0_#5b21b6]"
          >
            👛 Wallet
          </button>

          <CeloChainSettings soundEnabled={soundEnabled} />

          <button
            type="button"
            onClick={() => {
              playSfx("tap", soundEnabled);
              setConfirmReset(true);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-[3px] border-white bg-gradient-to-b from-rose-300 to-red-600 py-3 font-display text-base font-black text-white shadow-[0_5px_0_#991b1b]"
          >
            ↺ Start over
          </button>

          {confirmReset && (
            <div className="space-y-2 rounded-2xl border-[3px] border-white bg-black/25 p-3">
              <p className="text-center text-xs font-bold text-white">
                Erase all progress, Sparks, gallery art, and drawings? You&apos;ll
                go back to the welcome screen.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="rounded-xl border-2 border-white bg-white/20 py-2 text-xs font-black text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetGame();
                    playSfx("claim", soundEnabled);
                    setConfirmReset(false);
                    onClose();
                    window.location.href = "/";
                  }}
                  className="rounded-xl border-2 border-white bg-red-600 py-2 text-xs font-black text-white"
                >
                  Yes, reset
                </button>
              </div>
            </div>
          )}

          <a
            href="mailto:support@paintadom.app"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-[3px] border-white bg-gradient-to-b from-sky-300 to-blue-600 py-3 font-display text-base font-black text-white shadow-[0_5px_0_#1d4ed8]"
          >
            ✉ Support
          </a>

          <p
            className="pt-1 text-center text-sm font-black text-white"
            style={{ textShadow: "0 1px 0 rgba(0,0,0,0.35)" }}
          >
            Version number: 1.0.0
          </p>
          <div className="flex items-center justify-center gap-2">
            <p
              className="text-sm font-black text-white"
              style={{ textShadow: "0 1px 0 rgba(0,0,0,0.35)" }}
            >
              Player ID: {playerId || "—"}
            </p>
            {playerId && (
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(playerId);
                  playSfx("claim", soundEnabled);
                }}
                className="rounded-lg border-2 border-white bg-slate-600 px-2 py-0.5 text-[10px] font-black text-white"
              >
                COPY
              </button>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-2 text-center text-[11px] font-bold text-white/95 underline">
            <a href="/privacy">Privacy Policy</a>
            <a href="/account-deletion">Account Deletion</a>
            <a href="/responsible-gaming">Responsible Gaming</a>
            <a href="/terms">Terms</a>
          </div>
        </div>
      </div>
      <WalletModal
        open={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
      />
    </CenteredModal>
  );
}

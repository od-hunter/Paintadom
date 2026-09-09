"use client";

import { CenteredModal } from "@/components/ui/centered-modal";
import { useWalletActions } from "@/hooks/use-wallet-actions";
import { shortAddress } from "@/lib/wallet-from-email";

export function WalletModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const {
    activeAddress,
    email,
    isWagmiConnected,
    connectionKind,
    connectionLabel,
    magicEnabled,
    magicAvailable,
    miniPayAvailable,
    busy,
    error,
    setError,
    connectGoogle,
    connectMiniPay,
    disconnectWallet,
  } = useWalletActions();

  const handleConnect = async (fn: () => Promise<boolean>) => {
    setError(null);
    const ok = await fn();
    if (ok) onClose();
  };

  const handleDisconnect = async () => {
    const ok = await disconnectWallet();
    if (ok) onClose();
  };

  return (
    <CenteredModal
      open={open}
      onClose={onClose}
      zIndex={96}
      labelledBy="wallet-modal-title"
    >
      <div
        className="flex max-h-[min(90dvh,640px)] w-full flex-col overflow-hidden rounded-[1.85rem] border-[5px] border-white shadow-[0_14px_0_rgba(0,0,0,0.28)]"
        style={{
          background:
            "linear-gradient(180deg, #c4b5fd 0%, #8b5cf6 35%, #6d28d9 100%)",
        }}
      >
        <div className="relative shrink-0 px-4 pb-2 pt-4 text-center">
          <h2
            id="wallet-modal-title"
            className="font-display text-2xl font-black uppercase tracking-wide text-white"
            style={{ textShadow: "0 3px 0 rgba(0,0,0,0.35)" }}
          >
            Wallet
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white bg-red-500 text-xl font-black text-white shadow"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-5">
          <div className="rounded-2xl border-[3px] border-white/60 bg-white/20 p-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-violet-100">
              Status
            </p>
            <p className="mt-1 font-display text-lg font-black text-white">
              {connectionLabel}
            </p>
            {email && (
              <p className="mt-1 truncate text-xs font-bold text-violet-100">
                {email}
              </p>
            )}
            {activeAddress && (
              <div className="mt-2 rounded-xl border-2 border-white/50 bg-black/15 px-2.5 py-2">
                <p className="text-[9px] font-black uppercase text-violet-200">
                  Address
                </p>
                <p className="break-all font-mono text-[11px] font-bold text-white">
                  {activeAddress}
                </p>
                <p className="mt-0.5 text-center text-xs font-bold text-violet-200">
                  {shortAddress(activeAddress)}
                </p>
              </div>
            )}
          </div>

          {connectionKind === "email" && !isWagmiConnected && (
            <p className="rounded-xl border-2 border-white/40 bg-white/15 px-3 py-2 text-center text-xs font-bold text-white">
              Connect Google or MiniPay to sign on-chain with your live wallet.
            </p>
          )}

          {!isWagmiConnected && (
            <div className="space-y-2">
              <p className="text-center text-xs font-black uppercase tracking-wide text-violet-100">
                Connect
              </p>

              {magicAvailable && (
                <button
                  type="button"
                  disabled={busy || !magicEnabled}
                  onClick={() => void handleConnect(connectGoogle)}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl border-[3px] border-white bg-white py-3 font-display text-sm font-black text-slate-800 shadow-[0_4px_0_#cbd5e1] transition active:translate-y-0.5 disabled:opacity-60"
                >
                  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
                    <path
                      fill="#FFC107"
                      d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 5.1 29.3 3 24 3 12.3 3 3 12.3 3 24s9.3 21 21 21 21-9.3 21-21c0-1.4-.1-2.7-.4-3.5z"
                    />
                    <path
                      fill="#FF3D00"
                      d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 5.1 29.3 3 24 3 16.1 3 9.2 7.4 6.3 14.7z"
                    />
                    <path
                      fill="#4CAF50"
                      d="M24 45c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 36.6 26.8 37.5 24 37.5c-5.2 0-9.6-3.3-11.2-7.9l-6.5 5C9.1 40.6 16 45 24 45z"
                    />
                    <path
                      fill="#1976D2"
                      d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.5 5.5-6.5 6.9l.1.1 6.2 5.2C36.8 39.2 45 33 45 24c0-1.4-.1-2.7-.4-3.5z"
                    />
                  </svg>
                  {busy ? "Connecting…" : "Continue with Google"}
                </button>
              )}

              {miniPayAvailable ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleConnect(connectMiniPay)}
                  className="btn-lime w-full disabled:opacity-60"
                >
                  {busy ? "Connecting…" : "Connect MiniPay"}
                </button>
              ) : (
                <p className="text-center text-[11px] font-bold text-violet-100">
                  Open in MiniPay to connect your Celo wallet.
                </p>
              )}

              {!magicEnabled && !miniPayAvailable && (
                <p className="rounded-xl bg-amber-400/90 px-3 py-2 text-center text-[11px] font-bold text-amber-950">
                  Add NEXT_PUBLIC_MAGIC_API_KEY or open Paintadom in MiniPay.
                </p>
              )}
            </div>
          )}

          {isWagmiConnected && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleDisconnect()}
              className="w-full rounded-2xl border-[3px] border-white bg-gradient-to-b from-rose-300 to-red-600 py-3 font-display text-base font-black text-white shadow-[0_5px_0_#991b1b] disabled:opacity-60"
            >
              {busy ? "Disconnecting…" : "Disconnect wallet"}
            </button>
          )}

          {error && (
            <p className="rounded-xl bg-red-500/90 px-3 py-2 text-center text-xs font-bold text-white">
              {error}
            </p>
          )}
        </div>
      </div>
    </CenteredModal>
  );
}

"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAccount, useChainId, useWriteContract } from "wagmi";
import { erc20Abi, parseUnits, type Address, type Hex } from "viem";
import { useGameStore } from "@/store/game-store";
import { getInjectedEthereum } from "@/lib/wagmi";
import { GameIcon } from "@/components/ui/game-icon";
import {
  explorerTxUrl,
  getUsdtAddress,
  PACK_ID_BY_SHOP,
  PAINTADOM_GAME_ADDRESS,
  paintadomGameAbi,
  paintadomGameEnabled,
} from "@/lib/contracts/paintadom-game";
import { useLocalFiatPrices } from "@/hooks/use-local-fiat";

const TREASURY = (process.env.NEXT_PUBLIC_SPARKS_TREASURY || "") as Address;

export const SPARK_PACKS = [
  { id: "starter", sparks: 100, usdt: 0.25, label: "Starter" },
  { id: "painter", sparks: 500, usdt: 1.0, label: "Painter" },
  { id: "royal", sparks: 1500, usdt: 2.5, label: "Royal" },
] as const;

type Pack = (typeof SPARK_PACKS)[number];

function packUsdtAmount(pack: Pack): bigint {
  if (pack.id === "starter") return 250_000n;
  if (pack.id === "painter") return 1_000_000n;
  return 2_500_000n;
}

export function SparkShop({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const creditSparks = useGameStore((s) => s.buySparks);
  const mergeOnChainSparks = useGameStore((s) => s.mergeOnChainSparks);
  const syncSparksFromChain = useGameStore((s) => s.syncSparksFromChain);
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<Hex | null>(null);
  const [syncing, setSyncing] = useState(false);
  const { writeContractAsync, isPending } = useWriteContract();

  const { data: fx, byUsdt } = useLocalFiatPrices(
    SPARK_PACKS.map((p) => p.usdt)
  );

  const inMiniPay = Boolean(getInjectedEthereum()?.isMiniPay);
  const useGameContract = paintadomGameEnabled;
  const canPay =
    isConnected && Boolean(address) && (inMiniPay || useGameContract);

  const syncFromChain = useCallback(async () => {
    if (!address || !useGameContract) return;
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/chain/balance?address=${address}&chainId=${chainId}`
      );
      const data = (await res.json()) as {
        sparkBalance?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Balance sync failed");
      const bal = Number(data.sparkBalance || 0);
      const delta = mergeOnChainSparks(bal);
      setSuccess(
        delta > 0
          ? `Synced +${delta} Sparks from Celo`
          : `On-chain balance: ${bal} Sparks`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [address, chainId, mergeOnChainSparks, useGameContract]);

  const purchaseViaContract = async (pack: Pack) => {
    if (!address) return;
    const packId = PACK_ID_BY_SHOP[pack.id];
    if (packId == null) throw new Error("Unknown pack");

    const usdt = getUsdtAddress(chainId);
    const amount = packUsdtAmount(pack);

    await writeContractAsync({
      address: usdt,
      abi: erc20Abi,
      functionName: "approve",
      args: [PAINTADOM_GAME_ADDRESS, amount],
      chainId,
    });

    const hash = await writeContractAsync({
      address: PAINTADOM_GAME_ADDRESS,
      abi: paintadomGameAbi,
      functionName: "buySparksWithUSDC",
      args: [packId],
      chainId,
    });
    setTxHash(hash as Hex);

    const syncRes = await fetch("/api/chain/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, txHash: hash, chainId }),
    });
    const syncData = (await syncRes.json()) as {
      sparkBalance?: string;
      credited?: string;
    };

    if (syncRes.ok && syncData.sparkBalance != null) {
      syncSparksFromChain(Number(syncData.sparkBalance));
    } else if (syncRes.ok && syncData.credited) {
      creditSparks(Number(syncData.credited));
    } else {
      creditSparks(pack.sparks);
    }

    setSuccess(`Payment confirmed! +${pack.sparks} Sparks`);
  };

  const purchaseViaTreasury = async (pack: Pack) => {
    const token = getUsdtAddress(chainId);
    const amount = parseUnits(String(pack.usdt), 6);
    await writeContractAsync({
      address: token,
      abi: erc20Abi,
      functionName: "transfer",
      args: [TREASURY, amount],
      chainId,
    });
    creditSparks(pack.sparks);
    setSuccess(`Payment received! +${pack.sparks} Sparks`);
  };

  const purchase = async (pack: Pack) => {
    setError(null);
    setSuccess(null);
    setPendingId(pack.id);

    if (!isConnected || !address) {
      setError("Connect a wallet (MiniPay or Google) to buy Sparks.");
      setPendingId(null);
      return;
    }

    if (useGameContract) {
      try {
        await purchaseViaContract(pack);
        window.setTimeout(() => {
          setSuccess(null);
          onClose();
        }, 1800);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Payment failed";
        if (/reject|denied|cancel/i.test(msg)) {
          setError("Payment cancelled.");
        } else {
          setError("Payment failed. Check USDT balance / network and try again.");
        }
      } finally {
        setPendingId(null);
      }
      return;
    }

    if (!inMiniPay) {
      setError(
        "Open Paintadom in MiniPay, or set NEXT_PUBLIC_PAINTADOM_GAME_ADDRESS for on-chain shop."
      );
      setPendingId(null);
      return;
    }
    if (!TREASURY || TREASURY.length < 42) {
      setError(
        "Shop not ready — set NEXT_PUBLIC_PAINTADOM_GAME_ADDRESS or NEXT_PUBLIC_SPARKS_TREASURY."
      );
      setPendingId(null);
      return;
    }

    try {
      await purchaseViaTreasury(pack);
      window.setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 1500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Payment failed";
      if (/reject|denied|cancel/i.test(msg)) {
        setError("Payment cancelled in MiniPay.");
      } else {
        setError("Payment failed. Check your USDT balance and try again.");
      }
    } finally {
      setPendingId(null);
    }
  };

  const regionLabel =
    fx?.country === "NG"
      ? "Nigeria · Naira"
      : fx
        ? `${fx.country} · ${fx.currency}`
        : null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close shop"
            className="fixed inset-0 z-[80] bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="fixed inset-x-0 bottom-0 z-[85] mx-auto max-w-lg rounded-t-[1.75rem] border-t-4 border-x-4 border-white bg-gradient-to-b from-[#FDE68A] via-[#FBBF24] to-[#F59E0B] p-4 pb-8 shadow-2xl"
          >
            <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-white/70" />
            <h2 className="text-center font-display text-2xl font-black text-amber-950">
              Spark Shop
            </h2>
            <p className="mt-1 text-center text-xs font-bold text-amber-900/70">
              {useGameContract
                ? "Pay with USDT on Celo · PaintadomGame"
                : "Pay with MiniPay USDT · real money"}
            </p>
            {regionLabel ? (
              <p className="mt-0.5 text-center text-[10px] font-bold text-amber-950/55">
                Prices shown for {regionLabel}
              </p>
            ) : null}

            <div className="mt-4 space-y-2">
              {SPARK_PACKS.map((pack) => {
                const quote = byUsdt(pack.usdt);
                const showLocal =
                  quote &&
                  fx &&
                  fx.currency !== "USD" &&
                  quote.localLabel;
                return (
                  <button
                    key={pack.id}
                    type="button"
                    disabled={isPending}
                    onClick={() => purchase(pack)}
                    className="flex w-full items-center justify-between rounded-2xl border-[3px] border-white bg-gradient-to-b from-white to-amber-50 px-4 py-3 shadow-[0_5px_0_rgba(180,83,9,0.45)] active:translate-y-1 active:shadow-none disabled:opacity-60"
                  >
                    <span className="text-left">
                      <span className="block font-display text-lg font-black text-ink">
                        {pack.label}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-bold text-ink/60">
                        +{pack.sparks}{" "}
                        <GameIcon src="/icons/sparks.webp" size={14} /> Sparks
                      </span>
                    </span>
                    <span className="text-right">
                      {isPending && pendingId === pack.id ? (
                        <span className="rounded-full bg-gradient-to-b from-lime-300 to-green-500 px-4 py-2 text-sm font-black text-green-900 shadow">
                          Paying…
                        </span>
                      ) : (
                        <>
                          <span className="block rounded-full bg-gradient-to-b from-lime-300 to-green-500 px-4 py-1.5 text-sm font-black text-green-900 shadow">
                            {pack.usdt.toFixed(2)} USDT
                          </span>
                          {showLocal ? (
                            <span className="mt-1 block text-[10px] font-black text-amber-950/70">
                              ≈ {quote.localLabel}
                            </span>
                          ) : null}
                        </>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {useGameContract && address ? (
              <button
                type="button"
                disabled={syncing}
                onClick={() => syncFromChain()}
                className="mt-3 w-full rounded-xl border-2 border-amber-800/20 bg-white/70 py-2 text-xs font-black text-amber-950 disabled:opacity-60"
              >
                {syncing ? "Syncing…" : "Sync Sparks from Celo"}
              </button>
            ) : null}

            {error ? (
              <p className="mt-3 rounded-xl bg-red-100 px-3 py-2 text-center text-xs font-bold text-red-700">
                {error}
              </p>
            ) : null}
            {success ? (
              <p className="mt-3 rounded-xl bg-emerald-100 px-3 py-2 text-center text-xs font-bold text-emerald-700">
                {success}
              </p>
            ) : null}
            {!canPay ? (
              <p className="mt-3 text-center text-[11px] font-bold text-amber-950/70">
                Connect MiniPay or Google wallet to complete USDT purchases.
              </p>
            ) : null}
            {txHash ? (
              <a
                href={explorerTxUrl(chainId, txHash)}
                target="_blank"
                rel="noreferrer"
                className="mt-2 block text-center text-[10px] font-bold text-amber-950/60 underline"
              >
                View on Celoscan
              </a>
            ) : null}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

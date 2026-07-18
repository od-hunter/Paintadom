"use client";

import { useCallback, useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  stringToHex,
  type Hex,
  type Chain,
} from "viem";
import { celo, celoSepolia } from "viem/chains";
import {
  explorerTxUrl,
  getConfiguredChainId,
  PAINTADOM_GAME_ADDRESS,
  paintadomGameAbi,
  paintadomGameEnabled,
} from "@/lib/contracts/paintadom-game";
import { useGameStore } from "@/store/game-store";
import {
  accountFromEmail,
  getEmailWalletSession,
  setEmailWalletSession,
  walletFromEmail,
} from "@/lib/wallet-from-email";

export type ClaimReason =
  | "daily"
  | "spin"
  | "streak"
  | "puzzle"
  | "level_up"
  | "video"
  | "paint"
  | "manual";

const RPC: Record<number, string> = {
  [celo.id]: process.env.NEXT_PUBLIC_CELO_RPC || "https://forno.celo.org",
  [celoSepolia.id]:
    process.env.NEXT_PUBLIC_CELO_SEPOLIA_RPC ||
    "https://forno.celo-sepolia.celo-testnet.org",
};

function chainFor(id: number): Chain {
  return id === celoSepolia.id ? celoSepolia : celo;
}

async function fetchOnChainBalance(address: string, chainId: number) {
  const res = await fetch(
    `/api/chain/balance?address=${address}&chainId=${chainId}`
  );
  const data = (await res.json()) as {
    sparkBalance?: string;
    error?: string;
  };
  if (!res.ok) throw new Error(data.error || "Balance sync failed");
  return Number(data.sparkBalance || 0);
}

function friendlyChainError(raw: string): string {
  if (/claimNonce|returned no data|is not a contract/i.test(raw)) {
    return "Couldn’t reach the game contract on Celo Sepolia. Refresh and try again.";
  }
  if (/insufficient|gas|funds|exceeds balance/i.test(raw)) {
    return "Not enough CELO for gas on your painter wallet. Retry in a moment — Paintadom will top up Sepolia gas automatically.";
  }
  if (/reverted:\s*balance|execution reverted[\s\S]*balance/i.test(raw)) {
    return "Not enough Sparks on-chain for this purchase.";
  }
  if (/reject|denied|cancel/i.test(raw)) {
    return "Signature cancelled in wallet.";
  }
  if (raw.length > 140) {
    return "Transaction failed. Please try again.";
  }
  return raw;
}

/**
 * On-chain economy: claim / spend / commit.
 * Signing sources (in order):
 * 1. Connected wagmi wallet (MiniPay / Magic)
 * 2. Deterministic email wallet from login (no extra "connect" step)
 */
export function useChainEconomy() {
  const { address: wagmiAddress, isConnected } = useAccount();
  /** Always use the chain the contract is deployed on — not wagmi's UI default */
  const chainId = getConfiguredChainId();
  const syncSparksFromChain = useGameStore((s) => s.syncSparksFromChain);
  const setWalletAddress = useGameStore((s) => s.setWalletAddress);
  const email = useGameStore((s) => s.email);
  const storedWallet = useGameStore((s) => s.walletAddress);
  const level = useGameStore((s) => s.level);
  const { writeContractAsync, isPending } = useWriteContract();
  const [lastTx, setLastTx] = useState<Hex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localPending, setLocalPending] = useState(false);

  // Keep email session in sync for signing
  if (email && getEmailWalletSession() !== email.trim().toLowerCase()) {
    setEmailWalletSession(email);
  }

  const emailAddr = email ? walletFromEmail(email) : undefined;
  const playerAddress =
    (isConnected && wagmiAddress) || emailAddr || storedWallet;

  const ready =
    paintadomGameEnabled && Boolean(playerAddress);

  const syncBalance = useCallback(async () => {
    if (!playerAddress) return null;
    const bal = await fetchOnChainBalance(playerAddress, chainId);
    syncSparksFromChain(bal);
    return bal;
  }, [playerAddress, chainId, syncSparksFromChain]);

  /** Write via MiniPay/Magic OR email-derived local key */
  const writeGame = useCallback(
    async (args: {
      functionName: "claimReward" | "spendSparks" | "commitProgress";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      args: readonly any[];
    }) => {
      if (!paintadomGameEnabled) {
        throw new Error("On-chain game contract not configured");
      }

      const signerAddress =
        (isConnected && wagmiAddress) ||
        (email ? accountFromEmail(email.trim().toLowerCase()).address : null);

      if (signerAddress) {
        const gasRes = await fetch("/api/chain/ensure-gas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: signerAddress }),
        });
        const gasData = (await gasRes.json()) as { error?: string };
        if (!gasRes.ok) {
          throw new Error(
            gasData.error ||
              "Could not fund Sepolia gas for your painter wallet."
          );
        }
      }

      // Prefer live wagmi connection (MiniPay / Magic)
      if (isConnected && wagmiAddress) {
        return (await writeContractAsync({
          address: PAINTADOM_GAME_ADDRESS,
          abi: paintadomGameAbi,
          functionName: args.functionName,
          args: args.args as never,
          chainId,
          account: wagmiAddress,
        })) as Hex;
      }

      // Email login wallet — signs locally (this is the address shown after email OTP)
      const sessionEmail = getEmailWalletSession() || email?.trim().toLowerCase();
      if (!sessionEmail) {
        throw new Error(
          "No signing wallet. Sign in with email, Google (Magic), or open in MiniPay."
        );
      }

      const account = accountFromEmail(sessionEmail);
      setWalletAddress(account.address);

      const chain = chainFor(chainId);
      const rpc = RPC[chainId] || chain.rpcUrls.default.http[0];
      const walletClient = createWalletClient({
        account,
        chain,
        transport: http(rpc),
      });
      const publicClient = createPublicClient({
        chain,
        transport: http(rpc),
      });

      const hash = await walletClient.writeContract({
        address: PAINTADOM_GAME_ADDRESS,
        abi: paintadomGameAbi,
        functionName: args.functionName,
        args: args.args as never,
        chain,
        account,
      });

      // Wait briefly so balance reads are fresh
      try {
        await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
      } catch {
        /* still return hash — sync may catch up */
      }

      return hash;
    },
    [
      chainId,
      email,
      isConnected,
      setWalletAddress,
      wagmiAddress,
      writeContractAsync,
    ]
  );

  const claim = useCallback(
    async (
      amount: number,
      reason: ClaimReason,
      opts?: { nest?: boolean }
    ) => {
      setError(null);
      if (!opts?.nest) setLocalPending(true);
      try {
        if (!paintadomGameEnabled) {
          const msg = "On-chain game contract not configured";
          setError(msg);
          return { error: msg } as const;
        }
        if (!playerAddress) {
          const msg = "Sign in to get your Paintadom wallet first";
          setError(msg);
          return { error: msg } as const;
        }

        const sigRes = await fetch("/api/chain/claim-signature", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: playerAddress,
            amount,
            reason,
            chainId,
          }),
        });
        const signed = (await sigRes.json()) as {
          signature?: Hex;
          deadline?: string;
          amount?: string;
          rewardType?: number;
          error?: string;
        };
        if (
          !sigRes.ok ||
          !signed.signature ||
          !signed.deadline ||
          !signed.amount
        ) {
          const msg = friendlyChainError(
            signed.error || "Could not get claim signature"
          );
          setError(msg);
          return { error: msg } as const;
        }

        const hash = await writeGame({
          functionName: "claimReward",
          args: [
            signed.rewardType ?? 0,
            BigInt(signed.amount),
            BigInt(signed.deadline),
            signed.signature,
          ],
        });
        setLastTx(hash);

        await fetch("/api/chain/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: playerAddress, txHash: hash, chainId }),
        });

        const bal = await syncBalance();
        return {
          hash,
          explorer: explorerTxUrl(chainId, hash),
          sparkBalance: bal,
        };
      } catch (e) {
        const msg = friendlyChainError(
          e instanceof Error ? e.message : "Claim failed"
        );
        setError(msg);
        return { error: msg } as const;
      } finally {
        if (!opts?.nest) setLocalPending(false);
      }
    },
    [chainId, playerAddress, syncBalance, writeGame]
  );

  const spend = useCallback(
    async (amount: number) => {
      setError(null);
      setLocalPending(true);
      try {
        if (!paintadomGameEnabled) {
          const msg = "On-chain game contract not configured";
          setError(msg);
          return { error: msg } as const;
        }
        if (!playerAddress) {
          const msg = "Sign in to get your Paintadom wallet first";
          setError(msg);
          return { error: msg } as const;
        }
        if (amount <= 0) {
          const msg = "Invalid spend amount";
          setError(msg);
          return { error: msg } as const;
        }

        // Local Sparks (puzzle, etc.) may be ahead of chain — settle the gap
        // so spendSparks won't revert with "balance".
        let onChain = await fetchOnChainBalance(playerAddress, chainId);
        if (onChain < amount) {
          const localSparks = useGameStore.getState().sparks;
          const settle = Math.min(
            500,
            Math.max(0, Math.max(localSparks, amount) - onChain)
          );
          if (settle > 0) {
            const settled = await claim(settle, "manual", { nest: true });
            if (!("hash" in settled) || !settled.hash) {
              const msg =
                ("error" in settled && settled.error) ||
                `Need ${amount} Sparks on-chain (you have ${onChain}).`;
              setError(msg);
              return { error: msg } as const;
            }
            onChain = settled.sparkBalance ?? (await syncBalance()) ?? onChain;
          }
          if (onChain < amount) {
            const msg = `Need ${amount} Sparks on-chain (you have ${onChain}). Paint or buy Sparks first.`;
            setError(msg);
            return { error: msg } as const;
          }
        }

        const hash = await writeGame({
          functionName: "spendSparks",
          args: [BigInt(amount)],
        });
        setLastTx(hash);
        const bal = await syncBalance();
        return {
          hash,
          explorer: explorerTxUrl(chainId, hash),
          sparkBalance: bal,
        };
      } catch (e) {
        const msg = friendlyChainError(
          e instanceof Error ? e.message : "Spend failed"
        );
        setError(msg);
        return { error: msg } as const;
      } finally {
        setLocalPending(false);
      }
    },
    [chainId, claim, playerAddress, syncBalance, writeGame]
  );

  const commitProgress = useCallback(
    async (nextLevel?: number) => {
      setError(null);
      setLocalPending(true);
      try {
        if (!paintadomGameEnabled || !playerAddress) {
          const msg = "Wallet / contract not ready";
          setError(msg);
          return { error: msg } as const;
        }
        const lvl = nextLevel ?? level;
        const dataHash = keccak256(
          stringToHex(`paintadom:level:${lvl}:${playerAddress.toLowerCase()}`)
        );
        const hash = await writeGame({
          functionName: "commitProgress",
          args: [BigInt(lvl), dataHash],
        });
        setLastTx(hash);
        return { hash, explorer: explorerTxUrl(chainId, hash) };
      } catch (e) {
        const msg = friendlyChainError(
          e instanceof Error ? e.message : "Commit failed"
        );
        setError(msg);
        return { error: msg } as const;
      } finally {
        setLocalPending(false);
      }
    },
    [chainId, level, playerAddress, writeGame]
  );

  return {
    enabled: paintadomGameEnabled,
    ready,
    address: playerAddress,
    /** True if MiniPay/Magic is connected OR email wallet can sign */
    isConnected: Boolean(playerAddress),
    viaEmailWallet: Boolean(email && !isConnected),
    claim,
    spend,
    commitProgress,
    syncBalance,
    isPending: isPending || localPending,
    lastTx,
    error,
    setError,
  };
}

/** @deprecated use useChainEconomy */
export function useOnChainClaim() {
  const economy = useChainEconomy();
  return {
    enabled: economy.enabled,
    claim: economy.claim,
    commitProgress: economy.commitProgress,
    isPending: economy.isPending,
    lastTx: economy.lastTx,
    error: economy.error,
  };
}

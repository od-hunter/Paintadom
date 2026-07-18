"use client";

/**
 * Re-export — settings and older imports keep working.
 * Prefer `useChainEconomy` for new code.
 */
export {
  useOnChainClaim,
  useChainEconomy,
  type ClaimReason,
} from "@/hooks/use-chain-economy";

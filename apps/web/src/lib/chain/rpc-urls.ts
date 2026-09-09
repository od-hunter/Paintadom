import { celo, celoSepolia } from "viem/chains";

export const DEFAULT_CELO_MAINNET_RPC = "https://forno.celo.org";

/**
 * Magic's embedded wallet CSP allows `*.ankr.com` but not the official
 * `forno.celo-sepolia.celo-testnet.org` endpoint — use Ankr for browser signing.
 */
export const DEFAULT_CELO_SEPOLIA_RPC = "https://rpc.ankr.com/celo_sepolia";

/** Client-visible RPC (wagmi, Magic, hooks) */
export function publicCeloRpc(chainId: number): string {
  if (chainId === celoSepolia.id) {
    return (
      process.env.NEXT_PUBLIC_CELO_SEPOLIA_RPC?.trim() ||
      DEFAULT_CELO_SEPOLIA_RPC
    );
  }
  return process.env.NEXT_PUBLIC_CELO_RPC?.trim() || DEFAULT_CELO_MAINNET_RPC;
}

/** Server-side RPC (API routes, gas drip) */
export function serverCeloRpc(chainId: number): string {
  if (chainId === celoSepolia.id) {
    return (
      process.env.CELO_SEPOLIA_RPC?.trim() ||
      process.env.NEXT_PUBLIC_CELO_SEPOLIA_RPC?.trim() ||
      DEFAULT_CELO_SEPOLIA_RPC
    );
  }
  return (
    process.env.CELO_RPC?.trim() ||
    process.env.NEXT_PUBLIC_CELO_RPC?.trim() ||
    DEFAULT_CELO_MAINNET_RPC
  );
}

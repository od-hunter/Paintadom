import { type Address, type Hex } from "viem";
import { celo, celoSepolia } from "viem/chains";
import paintadomGameAbiJson from "./paintadom-game-abi.json";

/** Native Tether USDT on Celo — 6 decimals */
export const USDT_BY_CHAIN: Record<number, Address> = {
  [celo.id]: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
  [celoSepolia.id]: "0xd077A400968890Eacc75cdc901F0356c943e4fDb",
};

export const PAINTADOM_GAME_ADDRESS = (process.env
  .NEXT_PUBLIC_PAINTADOM_GAME_ADDRESS || "") as Address;

export const paintadomGameEnabled =
  typeof PAINTADOM_GAME_ADDRESS === "string" &&
  PAINTADOM_GAME_ADDRESS.length === 42;

/**
 * Chain the game contract lives on (from env).
 * Do NOT use wagmi's default chain — it may be Celo mainnet while the proxy is Sepolia-only.
 */
export function getConfiguredChainId(): number {
  const raw =
    process.env.NEXT_PUBLIC_CHAIN_ID || process.env.CHAIN_ID || "";
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return n;
  return celoSepolia.id;
}

/** Pack id → shop pack (matches on-chain initialize) */
export const PACK_ID_BY_SHOP: Record<string, number> = {
  starter: 0,
  painter: 1,
  royal: 2,
};

export const paintadomGameAbi =
  paintadomGameAbiJson as typeof paintadomGameAbiJson;

export function getUsdtAddress(chainId: number): Address {
  return USDT_BY_CHAIN[chainId] ?? USDT_BY_CHAIN[celoSepolia.id]!;
}

/** @deprecated use getUsdtAddress */
export const getUsdcAddress = getUsdtAddress;

export function explorerTxUrl(chainId: number, hash: Hex): string {
  if (chainId === celoSepolia.id) {
    return `https://sepolia.celoscan.io/tx/${hash}`;
  }
  return `https://celoscan.io/tx/${hash}`;
}

export const CLAIM_TYPES = {
  Claim: [
    { name: "player", type: "address" },
    { name: "rewardType", type: "uint8" },
    { name: "amount", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export const REWARD_SPARKS = 0;

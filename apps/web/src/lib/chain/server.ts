import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  type Address,
  type Hex,
  type Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo, celoSepolia } from "viem/chains";
import {
  CLAIM_TYPES,
  PAINTADOM_GAME_ADDRESS,
  paintadomGameAbi,
  paintadomGameEnabled,
  REWARD_SPARKS,
} from "@/lib/contracts/paintadom-game";
import { serverCeloRpc } from "@/lib/chain/rpc-urls";

const RPC: Record<number, string> = {
  [celo.id]: serverCeloRpc(celo.id),
  [celoSepolia.id]: serverCeloRpc(celoSepolia.id),
};

export function getChainId(): number {
  const raw = process.env.NEXT_PUBLIC_CHAIN_ID || process.env.CHAIN_ID;
  if (raw) return Number(raw);
  // Default to Celo Sepolia until mainnet deploy
  return celoSepolia.id;
}

export function getChain(chainId = getChainId()): Chain {
  return chainId === celoSepolia.id ? celoSepolia : celo;
}

export function getPublicClient(chainId = getChainId()) {
  const chain = getChain(chainId);
  return createPublicClient({
    chain,
    transport: http(RPC[chain.id] || chain.rpcUrls.default.http[0]),
  });
}

export function getGameAddress(): Address | null {
  if (!paintadomGameEnabled) return null;
  return PAINTADOM_GAME_ADDRESS;
}

export async function readSparkBalance(
  address: Address,
  chainId = getChainId()
): Promise<bigint> {
  const game = getGameAddress();
  if (!game) return 0n;
  const client = getPublicClient(chainId);
  return client.readContract({
    address: game,
    abi: paintadomGameAbi,
    functionName: "sparkBalance",
    args: [address],
  }) as Promise<bigint>;
}

export async function readClaimNonce(
  address: Address,
  chainId = getChainId()
): Promise<bigint> {
  const game = getGameAddress();
  if (!game) return 0n;
  const client = getPublicClient(chainId);
  return client.readContract({
    address: game,
    abi: paintadomGameAbi,
    functionName: "claimNonce",
    args: [address],
  }) as Promise<bigint>;
}

export function getRewardSignerAccount() {
  const key = process.env.REWARD_SIGNER_PRIVATE_KEY?.trim();
  if (!key) return null;
  const normalized = (key.startsWith("0x") ? key : `0x${key}`) as Hex;
  return privateKeyToAccount(normalized);
}

/** Below this, Sepolia players get a small CELO drip for gas */
const GAS_DRIP_THRESHOLD = parseEther("0.0003");
const GAS_DRIP_AMOUNT = parseEther("0.002");

/**
 * On Celo Sepolia only: if the player has almost no CELO, drip a tiny amount
 * from the reward signer so claim/spend txs can pay gas.
 */
export async function ensurePlayerGas(player: Address): Promise<{
  dripped: boolean;
  balance: string;
  txHash?: Hex;
}> {
  const chainId = getChainId();
  const client = getPublicClient(chainId);
  const balance = await client.getBalance({ address: player });

  if (chainId !== celoSepolia.id) {
    return { dripped: false, balance: balance.toString() };
  }
  if (balance >= GAS_DRIP_THRESHOLD) {
    return { dripped: false, balance: balance.toString() };
  }

  const account = getRewardSignerAccount();
  if (!account) {
    throw new Error("Reward signer not configured for gas drip");
  }

  const funderBal = await client.getBalance({ address: account.address });
  if (funderBal < GAS_DRIP_AMOUNT + parseEther("0.001")) {
    throw new Error(
      "Faucet wallet is low on Sepolia CELO — top up the reward signer to fund player gas."
    );
  }

  const chain = getChain(chainId);
  const wallet = createWalletClient({
    account,
    chain,
    transport: http(RPC[chain.id] || chain.rpcUrls.default.http[0]),
  });

  const txHash = await wallet.sendTransaction({
    account,
    chain,
    to: player,
    value: GAS_DRIP_AMOUNT,
  });

  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    timeout: 90_000,
  });
  if (receipt.status !== "success") {
    throw new Error("Sepolia gas drip transaction failed");
  }

  // Brief settle so subsequent writes see the funded balance
  let after = 0n;
  for (let i = 0; i < 5; i++) {
    after = await client.getBalance({ address: player });
    if (after >= GAS_DRIP_THRESHOLD) break;
    await new Promise((r) => setTimeout(r, 800));
  }

  if (after < GAS_DRIP_THRESHOLD) {
    throw new Error(
      "Gas drip sent but balance not visible yet — wait a few seconds and try again."
    );
  }

  return {
    dripped: true,
    balance: after.toString(),
    txHash,
  };
}

export async function signClaimReward(params: {
  player: Address;
  amount: bigint;
  rewardType?: number;
  deadlineSeconds?: number;
  chainId?: number;
}) {
  const account = getRewardSignerAccount();
  const game = getGameAddress();
  if (!account || !game) {
    throw new Error("Reward signer or game address not configured");
  }

  // Prefer env chain always for EIP-712 + nonce (ignore mismatched client chainId)
  const chainId = getChainId();
  const chain = getChain(chainId);
  const nonce = await readClaimNonce(params.player, chainId);
  const deadline =
    BigInt(Math.floor(Date.now() / 1000)) +
    BigInt(params.deadlineSeconds ?? 600);
  const rewardType = params.rewardType ?? REWARD_SPARKS;

  const wallet = createWalletClient({
    account,
    chain,
    transport: http(RPC[chain.id] || chain.rpcUrls.default.http[0]),
  });

  const signature = await wallet.signTypedData({
    account,
    domain: {
      name: "PaintadomGame",
      version: "1",
      chainId,
      verifyingContract: game,
    },
    types: CLAIM_TYPES,
    primaryType: "Claim",
    message: {
      player: params.player,
      rewardType,
      amount: params.amount,
      nonce,
      deadline,
    },
  });

  return {
    signature,
    nonce: nonce.toString(),
    deadline: deadline.toString(),
    amount: params.amount.toString(),
    rewardType,
    chainId,
    game,
  };
}

/** Allowed claim reasons → max sparks (anti-abuse baseline) */
export const CLAIM_LIMITS: Record<string, number> = {
  daily: 50,
  spin: 100,
  streak: 75,
  puzzle: 200,
  level_up: 200,
  video: 200,
  paint: 800,
  hang: 1, // not used for claims — spendSparks instead
  manual: 500,
};

import { NextResponse } from "next/server";
import {
  isAddress,
  type Address,
  type Hex,
  decodeEventLog,
  parseAbiItem,
} from "viem";
import {
  getChainId,
  getGameAddress,
  getPublicClient,
  readSparkBalance,
} from "@/lib/chain/server";
import { paintadomGameAbi } from "@/lib/contracts/paintadom-game";

export const runtime = "nodejs";

type Body = {
  address?: string;
  txHash?: string;
  chainId?: number;
};

const purchaseEvent = parseAbiItem(
  "event SparksPurchased(address indexed buyer, uint8 indexed packId, uint256 sparks, uint256 usdcPaid, uint256 newBalance)"
);
const claimEvent = parseAbiItem(
  "event RewardClaimed(address indexed player, uint8 indexed rewardType, uint256 amount, uint256 nonce, uint256 newBalance)"
);

export async function POST(req: Request) {
  const game = getGameAddress();
  if (!game) {
    return NextResponse.json(
      { error: "PaintadomGame not configured" },
      { status: 503 }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const address = body.address as Address | undefined;
  const txHash = body.txHash as Hex | undefined;
  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }
  if (!txHash || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return NextResponse.json({ error: "Invalid txHash" }, { status: 400 });
  }

  const chainId = getChainId();
  const client = getPublicClient(chainId);

  try {
    const receipt = await client.getTransactionReceipt({ hash: txHash });
    if (receipt.status !== "success") {
      return NextResponse.json({ error: "Transaction failed" }, { status: 400 });
    }

    let credited = 0n;
    let eventKind: "purchase" | "claim" | null = null;

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== game.toLowerCase()) continue;
      try {
        const decoded = decodeEventLog({
          abi: paintadomGameAbi,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === "SparksPurchased") {
          const args = decoded.args as unknown as {
            buyer: Address;
            sparks: bigint;
            newBalance: bigint;
          };
          if (args.buyer.toLowerCase() === address.toLowerCase()) {
            credited = args.sparks;
            eventKind = "purchase";
          }
        }
        if (decoded.eventName === "RewardClaimed") {
          const args = decoded.args as unknown as {
            player: Address;
            amount: bigint;
            newBalance: bigint;
          };
          if (args.player.toLowerCase() === address.toLowerCase()) {
            credited = args.amount;
            eventKind = "claim";
          }
        }
      } catch {
        // not our event
      }
    }

    // Fallback: also try typed parse for robustness
    if (!eventKind) {
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== game.toLowerCase()) continue;
        try {
          const d = decodeEventLog({
            abi: [purchaseEvent],
            data: log.data,
            topics: log.topics,
          });
          const args = d.args as { buyer: Address; sparks: bigint };
          if (args.buyer.toLowerCase() === address.toLowerCase()) {
            credited = args.sparks;
            eventKind = "purchase";
          }
        } catch {
          try {
            const d = decodeEventLog({
              abi: [claimEvent],
              data: log.data,
              topics: log.topics,
            });
            const args = d.args as { player: Address; amount: bigint };
            if (args.player.toLowerCase() === address.toLowerCase()) {
              credited = args.amount;
              eventKind = "claim";
            }
          } catch {
            /* ignore */
          }
        }
      }
    }

    const sparkBalance = await readSparkBalance(address, chainId);

    return NextResponse.json({
      ok: true,
      address,
      chainId,
      txHash,
      eventKind,
      credited: credited.toString(),
      sparkBalance: sparkBalance.toString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sync failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

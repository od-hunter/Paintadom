import { NextResponse } from "next/server";
import { isAddress, type Address } from "viem";
import {
  getGameAddress,
  getChainId,
  readSparkBalance,
} from "@/lib/chain/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const game = getGameAddress();
  if (!game) {
    return NextResponse.json(
      { error: "PaintadomGame not configured" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address") as Address | null;
  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const chainId = getChainId();
  try {
    const balance = await readSparkBalance(address, chainId);
    return NextResponse.json({
      address,
      chainId,
      game,
      sparkBalance: balance.toString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to read balance";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

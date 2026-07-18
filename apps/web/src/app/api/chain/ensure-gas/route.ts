import { NextResponse } from "next/server";
import { isAddress, type Address } from "viem";
import { ensurePlayerGas, getChainId } from "@/lib/chain/server";
import { celoSepolia } from "viem/chains";

export const runtime = "nodejs";

type Body = {
  address?: string;
};

/**
 * Drip a tiny amount of Sepolia CELO to the player wallet when empty,
 * so email-wallet claims can pay gas without MetaMask.
 */
export async function POST(req: Request) {
  if (getChainId() !== celoSepolia.id) {
    return NextResponse.json({
      ok: true,
      dripped: false,
      skipped: "mainnet",
    });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const address = body.address as Address | undefined;
  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  try {
    const result = await ensurePlayerGas(address);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gas drip failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

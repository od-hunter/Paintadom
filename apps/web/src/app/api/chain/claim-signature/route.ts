import { NextResponse } from "next/server";
import { isAddress, type Address } from "viem";
import {
  CLAIM_LIMITS,
  getGameAddress,
  getRewardSignerAccount,
  signClaimReward,
} from "@/lib/chain/server";

export const runtime = "nodejs";

type Body = {
  address?: string;
  amount?: number | string;
  reason?: string;
  rewardType?: number;
  chainId?: number;
};

export async function POST(req: Request) {
  if (!getGameAddress()) {
    return NextResponse.json(
      { error: "PaintadomGame not configured" },
      { status: 503 }
    );
  }
  if (!getRewardSignerAccount()) {
    return NextResponse.json(
      { error: "REWARD_SIGNER_PRIVATE_KEY not configured" },
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
  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const reason = (body.reason || "manual").toLowerCase();
  const max = CLAIM_LIMITS[reason];
  if (max == null) {
    return NextResponse.json(
      { error: `Unknown reason. Allowed: ${Object.keys(CLAIM_LIMITS).join(", ")}` },
      { status: 400 }
    );
  }

  const amountNum = Number(body.amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0 || amountNum > max) {
    return NextResponse.json(
      { error: `Amount must be 1–${max} for reason "${reason}"` },
      { status: 400 }
    );
  }

  try {
    const signed = await signClaimReward({
      player: address,
      amount: BigInt(Math.floor(amountNum)),
      rewardType: body.rewardType ?? 0,
      chainId: body.chainId,
    });
    return NextResponse.json({ ok: true, reason, ...signed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sign failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

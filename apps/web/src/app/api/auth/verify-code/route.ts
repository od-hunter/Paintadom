import { NextResponse } from "next/server";

type CodeStore = Map<string, { code: string; expires: number }>;

function getStore(): CodeStore {
  const g = globalThis as unknown as { __paintadomCodes?: CodeStore };
  if (!g.__paintadomCodes) g.__paintadomCodes = new Map();
  return g.__paintadomCodes;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    email?: string;
    code?: string;
  } | null;
  const email = body?.email?.trim().toLowerCase();
  const code = body?.code?.trim();
  if (!email || !code) {
    return NextResponse.json({ ok: false, error: "Email and code required" }, { status: 400 });
  }

  const store = getStore();
  const entry = store.get(email);
  if (!entry || entry.expires < Date.now()) {
    return NextResponse.json({ ok: false, error: "Code expired — request a new one" }, { status: 400 });
  }
  if (entry.code !== code) {
    return NextResponse.json({ ok: false, error: "Incorrect code" }, { status: 400 });
  }
  store.delete(email);
  return NextResponse.json({ ok: true });
}

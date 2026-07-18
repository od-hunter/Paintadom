import { NextResponse } from "next/server";
import { randomInt } from "crypto";

type CodeStore = Map<string, { code: string; expires: number }>;

function getStore(): CodeStore {
  const g = globalThis as unknown as { __paintadomCodes?: CodeStore };
  if (!g.__paintadomCodes) g.__paintadomCodes = new Map();
  return g.__paintadomCodes;
}

async function sendEmail(to: string, code: string): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.RESEND_FROM_EMAIL ?? "Paintadom <onboarding@resend.dev>";

  if (!apiKey) {
    return {
      sent: false,
      error:
        "RESEND_API_KEY not set — add it to .env.local to send real emails",
    };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Your Paintadom verification code",
      html: `
        <div style="font-family:sans-serif;max-width:420px;margin:0 auto;padding:24px">
          <h1 style="color:#7c3aed">Paintadom</h1>
          <p>Your verification code is:</p>
          <p style="font-size:32px;font-weight:800;letter-spacing:8px;color:#111">${code}</p>
          <p style="color:#666">This code expires in 10 minutes.</p>
        </div>
      `,
      text: `Your Paintadom verification code is ${code}. It expires in 10 minutes.`,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return { sent: false, error: err.slice(0, 200) };
  }
  return { sent: true };
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { ok: false, error: "Valid email required" },
      { status: 400 }
    );
  }

  const code = String(randomInt(100000, 999999));
  getStore().set(email, { code, expires: Date.now() + 10 * 60_000 });

  const mail = await sendEmail(email, code);

  if (!mail.sent && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        ok: false,
        error:
          "We couldn’t send the verification email. Please try again later or use Continue with Google.",
      },
      { status: 503 }
    );
  }

  const payload: {
    ok: true;
    message: string;
    emailed: boolean;
    /** Local/dev only — never returned in production */
    devCode?: string;
  } = {
    ok: true,
    message: mail.sent
      ? "Verification code sent to your email"
      : "Verification code ready",
    emailed: mail.sent,
  };

  // Local testing only when Resend isn’t configured
  if (process.env.NODE_ENV !== "production" && !mail.sent) {
    payload.devCode = code;
  }

  return NextResponse.json(payload);
}

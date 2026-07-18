"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useConnect, useConnectors } from "wagmi";
import { useGameStore } from "@/store/game-store";
import { AVATARS, WELCOME_BG, type AvatarId } from "@/data/buildings";
import { walletFromEmail, shortAddress } from "@/lib/wallet-from-email";
import {
  isMagicConnector,
  magicEnabled,
  readMagicOAuthEmail,
} from "@/lib/wagmi";

type Phase = "email" | "code" | "wallet" | "artist";

export function Onboarding() {
  const completeOnboarding = useGameStore((s) => s.completeOnboarding);
  const setAuthProfile = useGameStore((s) => s.setAuthProfile);

  const connectors = useConnectors();
  const { connectAsync } = useConnect();
  const magicConnector = connectors.find(isMagicConnector);

  const [phase, setPhase] = useState<Phase>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [emailed, setEmailed] = useState(false);
  const [wallet, setWallet] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [avatarId, setAvatarId] = useState<AvatarId>(AVATARS[0].id);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selected = AVATARS.find((a) => a.id === avatarId) ?? AVATARS[0];

  const loginWithGoogle = async () => {
    setError(null);
    if (!magicEnabled || !magicConnector) {
      setError(
        "Magic wallet is not configured. Add NEXT_PUBLIC_MAGIC_API_KEY and enable Google in the Magic Dashboard."
      );
      return;
    }
    setBusy(true);
    try {
      const result = await connectAsync({ connector: magicConnector });
      const addr = result.accounts[0];
      if (!addr) throw new Error("No wallet address from Magic");

      const oauthEmail = readMagicOAuthEmail()?.trim().toLowerCase();
      const accountEmail = oauthEmail || email.trim().toLowerCase() || "";

      setWallet(addr);
      if (accountEmail) {
        setEmail(accountEmail);
        setAuthProfile(accountEmail, addr);
      } else {
        setAuthProfile(`${addr.slice(2, 10).toLowerCase()}@google.magic`, addr);
      }
      setPhase("wallet");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Google sign-in was cancelled";
      if (!/user rejected|cancel/i.test(msg)) {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const requestCode = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Could not send code");
        return;
      }
      if (data.devCode) {
        setDevCode(data.devCode);
        setCode(data.devCode);
      }
      setEmailed(!!data.emailed);
      setPhase("code");
    } catch {
      setError("Network error — try again");
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Invalid code");
        return;
      }
      // Prefer Magic email wallet when available; otherwise deterministic local address
      if (magicEnabled && magicConnector) {
        try {
          const result = await connectAsync({ connector: magicConnector });
          const addr = result.accounts[0];
          if (addr) {
            setWallet(addr);
            setAuthProfile(email.trim().toLowerCase(), addr);
            setPhase("wallet");
            return;
          }
        } catch {
          /* fall through to local wallet */
        }
      }
      const addr = walletFromEmail(email);
      setWallet(addr);
      setAuthProfile(email.trim().toLowerCase(), addr);
      setPhase("wallet");
    } catch {
      setError("Network error — try again");
    } finally {
      setBusy(false);
    }
  };

  const finishArtist = () => {
    completeOnboarding(name || "Painter", "", avatarId);
  };

  const scrollIntoView = (e: React.FocusEvent<HTMLInputElement>) => {
    window.setTimeout(() => {
      e.target.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <Image
        src={WELCOME_BG}
        alt=""
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60" />

      <div
        ref={scrollRef}
        className="relative z-10 flex h-full flex-col overflow-y-auto overscroll-contain px-5 pb-10 pt-10"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="mx-auto mt-auto w-full max-w-lg"
          >
            <div
              className="space-y-4 rounded-[1.75rem] bg-white/95 p-5 shadow-2xl"
              style={{
                border: "4px solid transparent",
                backgroundImage:
                  "linear-gradient(#fff, #fff), linear-gradient(135deg, #f472b6, #fbbf24, #34d399, #60a5fa, #a78bfa, #fb923c)",
                backgroundOrigin: "border-box",
                backgroundClip: "padding-box, border-box",
                boxShadow:
                  "0 8px 0 rgba(124,58,237,0.35), 0 14px 28px rgba(0,0,0,0.25)",
              }}
            >
              {phase === "email" && (
                <>
                  <h2 className="text-center font-display text-2xl font-bold text-ink">
                    Sign in to Paintadom
                  </h2>
                  <p className="text-center text-sm font-bold text-ink/60">
                    Use Google or email — Magic creates your Celo wallet.
                  </p>

                  <button
                    type="button"
                    disabled={busy || !magicEnabled}
                    onClick={loginWithGoogle}
                    className="flex w-full items-center justify-center gap-3 rounded-2xl border-[3px] border-slate-200 bg-white py-3.5 font-display text-base font-black text-slate-800 shadow-[0_4px_0_#cbd5e1] transition active:translate-y-1 active:shadow-none disabled:opacity-50"
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 48 48"
                      aria-hidden
                    >
                      <path
                        fill="#FFC107"
                        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 5.1 29.3 3 24 3 12.3 3 3 12.3 3 24s9.3 21 21 21 21-9.3 21-21c0-1.4-.1-2.7-.4-3.5z"
                      />
                      <path
                        fill="#FF3D00"
                        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 5.1 29.3 3 24 3 16.1 3 9.2 7.4 6.3 14.7z"
                      />
                      <path
                        fill="#4CAF50"
                        d="M24 45c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 36.6 26.8 37.5 24 37.5c-5.2 0-9.6-3.3-11.2-7.9l-6.5 5C9.1 40.6 16 45 24 45z"
                      />
                      <path
                        fill="#1976D2"
                        d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.5 5.5-6.5 6.9l.1.1 6.2 5.2C36.8 39.2 45 33 45 24c0-1.4-.1-2.7-.4-3.5z"
                      />
                    </svg>
                    {busy ? "Opening Magic…" : "Continue with Google"}
                  </button>

                  {!magicEnabled && (
                    <p className="rounded-xl bg-amber-50 px-3 py-2 text-center text-[11px] font-bold text-amber-900">
                      Set <span className="font-black">NEXT_PUBLIC_MAGIC_API_KEY</span>{" "}
                      and enable Google OAuth in the Magic Dashboard.
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    <span className="h-px flex-1 bg-slate-200" />
                    <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                      or email
                    </span>
                    <span className="h-px flex-1 bg-slate-200" />
                  </div>

                  <label className="block text-left text-sm font-bold text-ink/70">
                    Email
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={scrollIntoView}
                      placeholder="you@email.com"
                      className="mt-1 w-full rounded-2xl border-2 border-violet-200 bg-white px-4 py-3 text-base font-bold text-ink outline-none focus:border-purple"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busy || !email.includes("@")}
                    onClick={requestCode}
                    className="btn-3d-gold w-full text-lg disabled:opacity-50"
                  >
                    {busy ? "Sending…" : "Send verification code"}
                  </button>
                </>
              )}

              {phase === "code" && (
                <>
                  <h2 className="text-center font-display text-2xl font-bold text-ink">
                    Enter code
                  </h2>
                  <p className="text-center text-sm font-bold text-slate-700">
                    {emailed
                      ? `Check your inbox at ${email}`
                      : `Code sent for ${email}`}
                  </p>
                  {devCode && !emailed ? (
                    <p className="rounded-xl bg-violet-50 px-3 py-2 text-center text-sm font-bold text-violet-900">
                      Your code is{" "}
                      <span className="font-black tracking-widest">{devCode}</span>
                    </p>
                  ) : null}
                  <input
                    inputMode="numeric"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onFocus={scrollIntoView}
                    placeholder="6-digit code"
                    className="w-full rounded-2xl border-2 border-violet-200 bg-white px-4 py-3 text-center font-display text-2xl font-black tracking-[0.3em] text-ink outline-none focus:border-purple"
                  />
                  <button
                    type="button"
                    disabled={busy || code.length < 6}
                    onClick={verifyCode}
                    className="btn-3d-gold w-full text-lg disabled:opacity-50"
                  >
                    {busy ? "Checking…" : "Verify"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhase("email")}
                    className="w-full text-sm font-bold text-ink/50"
                  >
                    Change email
                  </button>
                </>
              )}

              {phase === "wallet" && (
                <>
                  <h2 className="text-center font-display text-2xl font-bold text-ink">
                    Your Celo wallet
                  </h2>
                  <p className="text-center text-sm font-bold text-ink/60">
                    Powered by Magic.link on Celo
                  </p>
                  <div className="rounded-2xl border-[3px] border-sky-300 bg-gradient-to-b from-sky-100 to-blue-200 px-3 py-3">
                    <p className="text-center text-[10px] font-black uppercase tracking-wide text-blue-800">
                      Wallet address
                    </p>
                    <p className="mt-1 break-all text-center font-mono text-sm font-bold text-ink select-all">
                      {wallet}
                    </p>
                    <p className="mt-1 text-center text-xs font-bold text-blue-700">
                      {shortAddress(wallet)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPhase("artist")}
                    className="btn-3d-gold w-full text-lg"
                  >
                    Start Painting
                  </button>
                </>
              )}

              {phase === "artist" && (
                <>
                  <div className="flex justify-center">
                    <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-violet-100 shadow-lg">
                      <Image
                        src={selected.src}
                        alt={selected.name}
                        fill
                        className="object-contain object-bottom p-1"
                        sizes="96px"
                        priority
                      />
                    </div>
                  </div>
                  <h2 className="text-center font-display text-2xl font-bold text-ink">
                    Create your artist
                  </h2>
                  <label className="block text-left text-sm font-bold text-ink/70">
                    Artist name
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value.slice(0, 16))}
                      onFocus={scrollIntoView}
                      placeholder="Your painter name"
                      className="mt-1 w-full rounded-2xl border-2 border-violet-200 bg-white px-4 py-3 text-base font-bold text-ink outline-none focus:border-purple"
                    />
                  </label>
                  <div>
                    <p className="mb-2 text-left text-sm font-bold text-ink/70">
                      Choose your avatar
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {AVATARS.map((a) => {
                        const active = a.id === avatarId;
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => setAvatarId(a.id)}
                            className={`flex flex-col items-center rounded-2xl border-[3px] p-1.5 transition ${
                              active
                                ? "border-purple bg-violet-100 shadow-md"
                                : "border-white bg-white/80"
                            }`}
                          >
                            <span className="relative h-14 w-14 overflow-hidden rounded-full bg-violet-50">
                              <Image
                                src={a.src}
                                alt={a.name}
                                fill
                                className="object-contain object-bottom p-0.5"
                                sizes="56px"
                              />
                            </span>
                            <span className="mt-1 text-[10px] font-black text-ink">
                              {a.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={finishArtist}
                    className="btn-3d-gold w-full text-lg"
                  >
                    Enter Paintadom
                  </button>
                </>
              )}

              {error && (
                <p className="text-center text-sm font-bold text-red-600">{error}</p>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

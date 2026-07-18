"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Blank freestyle entry → drawing picker */
export default function FreestyleIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/paint?tab=freestyle");
  }, [router]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-sky-100">
      <p className="font-bold text-ink/70">Opening freestyle…</p>
    </div>
  );
}

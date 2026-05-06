"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminAccess() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitAccess() {
    setError("");
    setIsSubmitting(true);

    const response = await fetch("/api/admin-access", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      setError(result.error || "Access denied.");
      return;
    }

    const next = new URLSearchParams(window.location.search).get("next");
    router.replace(next || "/admin");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.10),transparent_30rem),#050505] px-5 text-white">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-900/90 p-6 shadow-2xl shadow-black/40">
        <h1 className="mb-2 text-2xl font-black">Admin Gate</h1>
        <p className="mb-5 text-sm text-neutral-400">
          Enter the private access code before signing in.
        </p>

        <input
          type="password"
          placeholder="Access code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submitAccess();
          }}
          className="w-full rounded-xl border border-white/10 bg-neutral-950 px-4 py-3 outline-none placeholder:text-neutral-500 focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
        />

        {error && (
          <p className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}

        <button
          onClick={submitAccess}
          disabled={isSubmitting}
          className="mt-4 w-full rounded-xl bg-white px-4 py-3 font-bold text-black shadow-lg shadow-white/10 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Checking..." : "Continue"}
        </button>
      </div>
    </main>
  );
}

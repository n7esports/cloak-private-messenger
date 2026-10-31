"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const data = {
      alias: (form.elements.namedItem("alias") as HTMLInputElement).value,
      pin: (form.elements.namedItem("pin") as HTMLInputElement).value,
      profileName: (form.elements.namedItem("profileName") as HTMLInputElement).value,
    };
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Invalid credentials");
        setLoading(false);
        return;
      }
      router.push("/auth/sign-in");
      router.refresh();
    } catch {
      setError("Invalid credentials");
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-base px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-sans text-2xl font-semibold tracking-tight text-primary">UQZERA</h1>
          <p className="mt-2 text-sm text-secondary">Create your account</p>
        </div>
        <form onSubmit={onSubmit} className="bg-panel border border-default rounded-xl p-6 shadow-panel space-y-4">
          {error && <p className="text-sm text-status-danger">{error}</p>}
          <div className="space-y-1">
            <label htmlFor="alias" className="block text-xs font-medium text-secondary">Alias</label>
            <input id="alias" name="alias" type="text" required autoComplete="username" className="w-full rounded-lg border border-default bg-bg-input px-3 py-2 text-sm text-primary placeholder:text-muted outline-none focus:border-accent-emerald transition" />
          </div>
          <div className="space-y-1">
            <label htmlFor="pin" className="block text-xs font-medium text-secondary">PIN</label>
            <input id="pin" name="pin" type="password" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} required autoComplete="new-password" className="w-full rounded-lg border border-default bg-bg-input px-3 py-2 text-sm text-primary placeholder:text-muted outline-none focus:border-accent-emerald transition" placeholder="••••••" />
          </div>
          <div className="space-y-1">
            <label htmlFor="profileName" className="block text-xs font-medium text-secondary">Profile name (optional)</label>
            <input id="profileName" name="profileName" type="text" autoComplete="name" className="w-full rounded-lg border border-default bg-bg-input px-3 py-2 text-sm text-primary placeholder:text-muted outline-none focus:border-accent-emerald transition" placeholder="Shown only to you" />
          </div>
          <button type="submit" disabled={loading} className="mt-2 w-full rounded-xl bg-accent-emerald py-2.5 text-sm font-medium text-text-inverse transition hover:bg-accent-hover disabled:opacity-60">
            {loading ? "Creating account…" : "Sign up"}
          </button>
        </form>
        <p className="mt-3 text-center text-xs text-secondary">Already have an account? <Link href="/auth/sign-in" className="text-accent-emerald hover:underline">Sign in</Link></p>
      </div>
    </div>
  );
}
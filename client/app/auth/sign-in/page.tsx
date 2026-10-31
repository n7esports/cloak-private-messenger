"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const data = {
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      password: (form.elements.namedItem("password") as HTMLInputElement).value,
    };

    try {
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Invalid email or password");
        setLoading(false);
        return;
      }
      router.push("/chats");
      router.refresh();
    } catch {
      setError("Invalid email or password");
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-base px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-sans text-2xl font-semibold tracking-tight text-primary">
            UQZERA
          </h1>
          <p className="mt-2 text-sm text-secondary">Welcome back</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-panel border border-default rounded-xl p-6 shadow-panel space-y-4"
        >
          {error && (
            <p className="text-sm text-status-danger">{error}</p>
          )}

          <div className="space-y-1">
            <label htmlFor="email" className="block text-xs font-medium text-secondary">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-default bg-bg-input px-3 py-2 text-sm text-primary placeholder:text-muted outline-none focus:border-accent-emerald transition"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="block text-xs font-medium text-secondary">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={1}
              autoComplete="current-password"
              className="w-full rounded-lg border border-default bg-bg-input px-3 py-2 text-sm text-primary placeholder:text-muted outline-none focus:border-accent-emerald transition"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-accent-emerald py-2.5 text-sm font-medium text-text-inverse transition hover:bg-accent-hover disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-secondary">
          By signing in you agree to our{" "}
          <Link href="/legal/terms" className="text-accent-emerald hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/legal/privacy" className="text-accent-emerald hover:underline">
            Privacy Policy
          </Link>
          .
        </p>

        <p className="mt-3 text-center text-xs text-secondary">
          Don&apos;t have an account?{" "}
          <Link href="/auth/sign-up" className="text-accent-emerald hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

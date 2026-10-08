"use client";

export default function HowItWorksLink() {
  return (
    <a
      href="#how-it-works"
      onClick={(event) => {
        event.preventDefault();
        document
          .getElementById("how-it-works")
          ?.scrollIntoView({ behavior: "smooth" });
      }}
      className="flex min-h-12 items-center justify-center rounded-lg border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-cloak-accent"
    >
      How it works
    </a>
  );
}

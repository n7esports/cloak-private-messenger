import Link from "next/link";

const principles = [
  {
    title: "Zero-knowledge by design",
    description:
      "Messages are encrypted on your device before delivery. Relays move ciphertext and cannot read your conversations.",
  },
  {
    title: "Stored on your device",
    description:
      "Your identity, conversations, and private notes live in your encrypted local vault—not in a centralized account.",
  },
  {
    title: "No central server",
    description:
      "Cloak has no account directory or central message store. Use an available relay for delivery, or keep working offline.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-dvh overflow-y-auto bg-[#09090b] text-zinc-100">
      <section className="relative isolate flex min-h-[82dvh] flex-col items-center justify-center overflow-hidden px-6 py-24 text-center">
        <div
          aria-hidden="true"
          className="cloak-hero-pulse absolute left-1/2 top-1/2 -z-10 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#10b981]/20 blur-[100px] sm:h-96 sm:w-96"
        />
        <div
          aria-hidden="true"
          className="mb-8 grid h-16 w-16 place-items-center rounded-2xl border border-[#10b981]/40 bg-[#10b981]/10 text-3xl text-[#10b981] shadow-[0_0_50px_rgba(16,185,129,0.16)]"
        >
          ◈
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#10b981]">
          Cloak Private Messenger
        </p>
        <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight sm:text-6xl">
          Your messages. Your device. Your rules.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
          Zero accounts, zero phone numbers, and zero plaintext servers. Your
          messages are encrypted on this device before they leave it.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/setup"
            className="flex min-h-12 items-center justify-center rounded-lg bg-[#10b981] px-6 py-3 text-sm font-semibold text-[#09090b] transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:ring-offset-2 focus:ring-offset-[#09090b]"
          >
            Get Started
          </Link>
          <a
            href="#how-it-works"
            className="flex min-h-12 items-center justify-center rounded-lg border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-[#10b981]"
          >
            How it works
          </a>
        </div>
      </section>

      <section
        id="how-it-works"
        className="mx-auto max-w-6xl scroll-mt-8 px-6 pb-24 pt-8 sm:px-8"
      >
        <div className="mb-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#10b981]">
            Private by architecture
          </p>
          <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">
            How Cloak works
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {principles.map((principle) => (
            <article
              key={principle.title}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6"
            >
              <div
                aria-hidden="true"
                className="mb-5 h-1 w-10 rounded-full bg-[#10b981]"
              />
              <h3 className="text-lg font-semibold">{principle.title}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                {principle.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

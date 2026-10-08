import Link from "next/link";

export default function ChannelsPage() {
  return (
    <main className="cloak-app-screen flex flex-col bg-cloak-base font-sans text-cloak-text">
      <header className="flex items-center justify-between border-b border-cloak-border bg-cloak-surface-1 px-4 py-4 sm:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cloak-accent">
            Encrypted group conversations
          </p>
          <h1 className="mt-1 text-lg font-semibold">Channels</h1>
        </div>
        <Link
          href="/chats"
          className="flex min-h-11 items-center rounded-lg border border-cloak-border px-4 py-2 text-sm transition hover:bg-cloak-surface-2 focus:outline-none focus:ring-2 focus:ring-cloak-accent"
        >
          All chats
        </Link>
      </header>
      <section className="grid flex-1 place-items-center px-6 py-10">
        <div className="max-w-md text-center">
          <div
            aria-hidden="true"
            className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-cloak-accent/10 text-2xl text-cloak-accent"
          >
            ◈
          </div>
          <h2 className="text-xl font-semibold">No channels yet</h2>
          <p className="mt-3 text-sm leading-6 text-cloak-muted">
            Channel messages are encrypted for their subscribers. Private
            channel keys rotate when the subscriber list changes.
          </p>
          <Link
            href="/chats/welcome"
            className="mt-6 inline-flex min-h-11 items-center rounded-lg border border-cloak-border px-4 py-2 text-sm font-medium text-cloak-text transition hover:bg-cloak-surface-2 focus:outline-none focus:ring-2 focus:ring-cloak-accent"
          >
            New to Cloak? Open System Guide →
          </Link>
        </div>
      </section>
    </main>
  );
}

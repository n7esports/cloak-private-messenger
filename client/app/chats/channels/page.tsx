import Link from "next/link";
import {
  IconBroadcast,
  IconChevronLeft,
  IconLock,
} from "../../../components/icons/UiIcons";

export default function ChannelsPage() {
  return (
    <main className="cloak-ambient cloak-app-screen flex flex-col font-sans text-cloak-text">
      <header className="cloak-glass flex items-center gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/chats"
          className="cloak-glass-soft grid h-10 w-10 place-items-center rounded-xl md:hidden"
          aria-label="Back to conversations"
        >
          <IconChevronLeft className="h-5 w-5" />
        </Link>
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-cloak-accent/30 bg-cloak-accent/10 text-cloak-accent">
          <IconBroadcast className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold">Channels</h1>
          <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-emerald-500 font-medium">
            <IconLock className="h-3.5 w-3.5" /> E2EE Groups
          </span>
        </div>
        <Link
          href="/chats"
          className="cloak-glass-soft hidden min-h-10 rounded-xl px-4 text-sm text-cloak-muted transition hover:text-cloak-text md:inline-flex md:items-center"
        >
          All chats
        </Link>
      </header>

      <section className="cloak-scroll grid flex-1 place-items-center overflow-y-auto px-6 py-10">
        <div className="cloak-glass max-w-md rounded-2xl p-8 text-center">
          <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-cloak-accent/10 text-cloak-accent">
            <IconBroadcast className="h-7 w-7" />
          </span>
          <h2 className="text-lg font-semibold">No channels yet</h2>
          <p className="mt-3 text-sm leading-6 text-cloak-muted">
            Channels broadcast to many people at once. Messages are encrypted for
            their subscribers, and private channel keys rotate whenever the
            subscriber list changes.
          </p>
          <Link
            href="/chats/channels"
            className="cloak-glass-soft mt-6 inline-flex min-h-10 items-center rounded-xl px-5 text-sm text-cloak-muted transition hover:text-cloak-text"
          >
            Browse channels
          </Link>
        </div>
      </section>
    </main>
  );
}

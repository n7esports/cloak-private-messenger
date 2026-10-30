import { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 - Page Not Found",
};

export default function NotFound() {
  return (
    <main id="main">
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <h1 className="font-sans text-6xl font-bold text-on-surface">Page not found</h1>
            <p className="mt-4 text-on-surface-variant">The page you requested does not exist.</p>
            <div className="mt-6 flex justify-center gap-4">
              <a
                href="/"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary"
              >
                Go home
              </a>
              <a
                href="/chats"
                className="rounded-lg bg-surface-container border border-hairline px-4 py-2 text-sm font-medium text-on-surface"
              >
                Open chats
              </a>
            </div>
          </div>
        </div>
      </main>
  );
}

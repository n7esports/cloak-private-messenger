import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Unsubscribe",
};

export default function UnsubscribePage() {
  return (
    <main id="main" className="p-6">
        <h1 className="font-sans text-2xl font-semibold tracking-tight text-on-surface">
          Unsubscribe
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-on-surface-variant">
          Opt out of non-essential emails, product updates, and marketing communications. Core account and security emails cannot be disabled.
        </p>
      </main>
  );
}

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security",
};

export default function SecurityPage() {
  return (
    <main id="main" className="p-6">
        <h1 className="font-sans text-2xl font-semibold tracking-tight text-on-surface">
          Security
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-on-surface-variant">
          Cloak applies end-to-end encryption, signed builds, and network hardening to protect your data. Learn about our audit process, bug bounty, and incident response commitments.
        </p>
      </main>
  );
}

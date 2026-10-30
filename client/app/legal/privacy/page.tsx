import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <main id="main" className="p-6">
        <h1 className="font-sans text-2xl font-semibold tracking-tight text-on-surface">
          Privacy Policy
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-on-surface-variant">
          Cloak is built around end-to-end encryption. We cannot read your messages, contacts, or media. This policy explains what minimal data we process to run the relay and app delivery, and how you can request deletion.
        </p>
      </main>
  );
}

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Request",
};

export default function DataRequestPage() {
  return (
    <main id="main" className="p-6">
        <h1 className="font-sans text-2xl font-semibold tracking-tight text-on-surface">
          Data Request
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-on-surface-variant">
          Because UQZERA stores end-to-end encrypted data, account exports are limited. Use this form to request metadata deletion, data portability summaries, or legal disclosures.
        </p>
      </main>
  );
}

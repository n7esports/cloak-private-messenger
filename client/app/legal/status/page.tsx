import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Status",
};

export default function StatusPage() {
  return (
    <main id="main" className="p-6">
        <h1 className="font-sans text-2xl font-semibold tracking-tight text-on-surface">
          Status
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-on-surface-variant">
          Real-time availability and incident history for UQZERA relays and APIs are published here so you can verify service health without contacting support.
        </p>
      </main>
  );
}

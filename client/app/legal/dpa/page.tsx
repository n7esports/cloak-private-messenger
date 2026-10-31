import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Processing Agreement",
};

export default function DpaPage() {
  return (
    <main id="main" className="p-6">
        <h1 className="font-sans text-2xl font-semibold tracking-tight text-on-surface">
          Data Processing Agreement
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-on-surface-variant">
          This DPA governs how UQZERA processes personal data on behalf of enterprise customers. It defines processor obligations, audit rights, and security controls under GDPR and CCPA.
        </p>
      </main>
  );
}

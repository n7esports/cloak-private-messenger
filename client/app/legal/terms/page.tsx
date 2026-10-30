import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <main id="main" className="p-6">
        <h1 className="font-sans text-2xl font-semibold tracking-tight text-on-surface">
          Terms of Service
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-on-surface-variant">
          By using Cloak, you agree not to misuse the service or attempt to break its encryption guarantees. These terms cover acceptable use, liability limits, and dispute resolution.
        </p>
      </main>
  );
}

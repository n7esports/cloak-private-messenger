import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Licenses",
};

export default function LicensesPage() {
  return (
    <main id="main" className="p-6">
        <h1 className="font-sans text-2xl font-semibold tracking-tight text-on-surface">
          Licenses
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-on-surface-variant">
          UQZERA includes open-source components. This page lists each dependency, its license type, and a link to the upstream project for attribution.
        </p>
      </main>
  );
}

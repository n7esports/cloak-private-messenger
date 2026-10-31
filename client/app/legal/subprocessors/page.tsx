import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subprocessors",
};

export default function SubprocessorsPage() {
  return (
    <main id="main" className="bg-base p-6">
        <h1 className="font-sans text-2xl font-semibold tracking-tight text-primary">
          Subprocessors
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-secondary">
          We use a small number of subprocessors to run infrastructure and support tools. This page lists each vendor, the data they access, and the purpose of processing.
        </p>
      </main>
  );
}

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookies",
};

export default function CookiesPage() {
  return (
    <main id="main" className="bg-base p-6">
        <h1 className="font-sans text-2xl font-semibold tracking-tight text-primary">
          Cookies
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-secondary">
          UQZERA does not use tracking cookies. Only essential cookies required for app state and security are set, and they are never shared with third parties.
        </p>
      </main>
  );
}

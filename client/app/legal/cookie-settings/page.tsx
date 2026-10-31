import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Settings",
};

export default function CookieSettingsPage() {
  return (
    <main id="main" className="bg-base p-6">
        <h1 className="font-sans text-2xl font-semibold tracking-tight text-primary">
          Cookie Settings
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-secondary">
          Manage essential and optional cookie preferences. Changes apply immediately and are stored locally without server-side identifiers.
        </p>
      </main>
  );
}

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
};

export default function ContactPage() {
  return (
    <main id="main" className="bg-base p-6">
        <h1 className="font-sans text-2xl font-semibold tracking-tight text-primary">
          Contact
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-secondary">
          Reach the UQZERA team for support, partnership inquiries, or security reports. We route messages to the right team within one business day.
        </p>
      </main>
  );
}

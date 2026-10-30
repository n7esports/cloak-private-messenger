import { Metadata } from "next";

export const metadata: Metadata = {
  title: "503 - Maintenance",
};

export default function Maintenance() {
  return (
    <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h1 className="font-sans text-6xl font-bold text-on-surface">503</h1>
          <p className="mt-4 text-on-surface-variant">We will be back soon.</p>
        </div>
      </div>
  );
}

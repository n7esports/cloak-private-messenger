import { Metadata } from "next";

export const metadata: Metadata = {
  title: "403 - Forbidden",
};

export default function Forbidden() {
  return (
    <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h1 className="font-sans text-6xl font-bold text-primary">403</h1>
          <p className="mt-4 text-secondary">You do not have permission to access this page.</p>
        </div>
      </div>
  );
}

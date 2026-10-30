"use client";


export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <h1 className="font-sans text-6xl font-bold text-on-surface">500</h1>
              <p className="mt-4 text-on-surface-variant">Something went wrong.</p>
              <button
                onClick={reset}
                className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary"
              >
                Try again
              </button>
            </div>
          </div>
      </body>
    </html>
  );
}

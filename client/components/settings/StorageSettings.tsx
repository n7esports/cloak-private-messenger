"use client";

export default function StorageSettings() {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-outline-variant/50 bg-surface-container/60 p-4">
        <h2 className="text-sm font-semibold text-on-surface">Storage / Data</h2>
        <p className="mt-1 text-xs text-outline">Manage local data and cache.</p>
        <div className="mt-3 flex flex-col gap-2">
          <button className="rounded-xl border border-outline-variant bg-surface-container/60 px-4 py-2 text-xs text-on-surface-variant hover:text-text-primary transition">
            Clear cache
          </button>
          <button className="rounded-xl border border-outline-variant bg-surface-container/60 px-4 py-2 text-xs text-on-surface-variant hover:text-text-primary transition">
            Export all data
          </button>
          <button className="rounded-xl border border-status-danger/30 bg-surface-container/60 px-4 py-2 text-xs text-status-danger hover:bg-status-danger/10 transition">
            Delete all local data
          </button>
        </div>
      </div>
    </div>
  );
}

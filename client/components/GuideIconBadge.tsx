import type { ReactNode } from "react";

export default function GuideIconBadge({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-cloak-surface2 text-cloak-accent">
      {children}
    </div>
  );
}

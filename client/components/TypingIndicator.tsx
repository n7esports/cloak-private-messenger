"use client";

export function TypingIndicator({ label = "typing" }: { label?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-cloak-accent"
      role="status"
      aria-live="polite"
    >
      <span className="inline-flex items-center gap-0.5">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="cloak-typing-dot h-1.5 w-1.5 rounded-full bg-cloak-accent"
            style={{ animationDelay: `${dot * 0.16}s` }}
          />
        ))}
      </span>
      {label}
    </span>
  );
}

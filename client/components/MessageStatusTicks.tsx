"use client";

import { IconCheck, IconCheckDouble, IconClock } from "./icons/UiIcons";
import type { MessageStatus } from "../store/useChatStore";

const labels: Record<MessageStatus, string> = {
  queued: "Queued",
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
};

export function MessageStatusTicks({ status }: { status: MessageStatus }) {
  const label = labels[status];
  const className =
    status === "read" ? "text-cloak-accent" : "text-cloak-muted";

  return (
    <span
      className={`inline-flex items-center gap-1 ${className}`}
      title={label}
      aria-label={label}
    >
      {status === "queued" ? (
        <IconClock className="h-3.5 w-3.5" />
      ) : status === "sent" ? (
        <IconCheck className="h-3.5 w-3.5" />
      ) : (
        <IconCheckDouble className="h-3.5 w-3.5" />
      )}
      <span className="text-[11px]">{label}</span>
    </span>
  );
}

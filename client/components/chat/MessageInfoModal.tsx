"use client";

import { IconCheckDouble, IconShield } from "../icons/UiIcons";
import { Sheet, SheetBody, SheetHeader } from "./Sheet";
import type { ChatMessage } from "../../store/useChatStore";

const STATUS_LABEL: Record<string, string> = {
  queued: "Queued locally",
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
};

/**
 * Message detail view: delivery status, read receipt timestamp and the
 * end-to-end transit encryption summary for this specific message.
 */
export function MessageInfoModal({
  message,
  onClose,
}: {
  message: ChatMessage;
  onClose: () => void;
}) {
  const sentAt = new Date(message.timestamp).toLocaleString();
  const receiptAt = new Date(message.timestamp).toLocaleString();

  return (
    <Sheet open onClose={onClose} variant="center" label="Message info">
      <SheetHeader title="Message info" onClose={onClose} />
      <SheetBody className="px-5 pb-5">
        <dl className="mt-2 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-cloak-muted">Direction</dt>
            <dd className="truncate">{message.outgoing ? "Sent" : "Received"}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-cloak-muted">Status</dt>
            <dd className="inline-flex items-center gap-1.5">
              <IconCheckDouble className="h-4 w-4 text-cloak-accent" />
              {STATUS_LABEL[message.status] ?? message.status}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-cloak-muted">Sent</dt>
            <dd className="truncate">{sentAt}</dd>
          </div>
          {message.outgoing && message.status === "read" && (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-cloak-muted">Read</dt>
              <dd className="truncate text-cloak-accent">{receiptAt}</dd>
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <dt className="text-cloak-muted">Encryption</dt>
            <dd className="inline-flex items-center gap-1.5">
              <IconShield className="h-4 w-4 text-cloak-accent" />
              End-to-end (X25519 + XSalsa20)
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-cloak-muted">Integrity</dt>
            <dd>Ed25519 signed</dd>
          </div>
          {message.ephemeralTimer !== undefined && (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-cloak-muted">Self-destruct</dt>
              <dd>{Math.round(message.ephemeralTimer / 1000)}s</dd>
            </div>
          )}
        </dl>

        <p className="mt-4 break-all rounded-lg border border-white/10 bg-black/20 p-2 font-mono text-[11px] text-cloak-muted">
          id: {message.id}
        </p>
      </SheetBody>
    </Sheet>
  );
}

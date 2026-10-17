"use client";

import { useEffect, useState, type ReactNode } from "react";
import { IconClose, IconFile, IconImage } from "./icons/UiIcons";
import {
  formatFileSize,
  isDataUrl,
  isInlineRenderableImage,
  type MessageAttachment,
} from "../lib/protocol";

function canRenderImage(attachment: MessageAttachment): boolean {
  const dataMime = attachment.data.slice(5, attachment.data.indexOf(";"));
  return (
    isInlineRenderableImage(attachment.mime) &&
    isDataUrl(attachment.data) &&
    dataMime.toLowerCase() === attachment.mime.toLowerCase()
  );
}

function AttachmentDownload({
  attachment,
  className,
  children,
}: {
  attachment: MessageAttachment;
  className: string;
  children: ReactNode;
}) {
  const [objectUrl, setObjectUrl] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let createdUrl: string | undefined;
    setObjectUrl("");
    setFailed(false);
    void fetch(attachment.data)
      .then((response) => response.blob())
      .then((blob) => {
        createdUrl = URL.createObjectURL(blob);
        if (active) setObjectUrl(createdUrl);
        else URL.revokeObjectURL(createdUrl);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [attachment.data]);

  if (!objectUrl) {
    return (
      <span className={className}>
        {children}
        {failed && (
          <span className="sr-only" role="status">
            Download unavailable
          </span>
        )}
      </span>
    );
  }

  return (
    <a href={objectUrl} download={attachment.name} className={className}>
      {children}
    </a>
  );
}

/**
 * Renders a decrypted attachment. Images and videos display inline from their
 * decrypted data URL; everything else becomes a download link. Nothing here
 * touches the network — the bytes were already decrypted in the client.
 */
export function AttachmentView({ attachment }: { attachment: MessageAttachment }) {
  if (canRenderImage(attachment)) {
    return (
      <AttachmentDownload
        attachment={attachment}
        className="block overflow-hidden rounded-xl border border-white/10"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.data}
          alt={attachment.name}
          className="max-h-80 w-full object-cover"
        />
      </AttachmentDownload>
    );
  }

  if (attachment.mime.startsWith("video/")) {
    return (
      <video
        controls
        preload="metadata"
        src={attachment.data}
        className="max-h-80 w-full rounded-xl border border-white/10"
      >
        <track kind="captions" />
      </video>
    );
  }

  return (
    <AttachmentDownload
      attachment={attachment}
      className="cloak-glass-soft flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-white/5"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cloak-accent/15 text-cloak-accent">
        {attachment.mime.startsWith("image/") ? (
          <IconImage className="h-4 w-4" />
        ) : (
          <IconFile className="h-4 w-4" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{attachment.name}</span>
        <span className="block text-[11px] text-cloak-muted">
          {formatFileSize(attachment.size)} · tap to download
        </span>
      </span>
    </AttachmentDownload>
  );
}

/** Small removable chip shown above the composer for a pending attachment. */
export function AttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: MessageAttachment;
  onRemove: () => void;
}) {
  return (
    <div className="cloak-glass-soft mb-2 flex items-center gap-3 rounded-xl px-3 py-2.5">
      {canRenderImage(attachment) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={attachment.data}
          alt=""
          className="h-10 w-10 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-cloak-accent/15 text-cloak-accent">
          <IconFile className="h-4 w-4" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{attachment.name}</span>
        <span className="block text-[11px] text-cloak-muted">
          {formatFileSize(attachment.size)} · encrypted before sending
        </span>
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${attachment.name}`}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-cloak-muted transition hover:text-cloak-text"
      >
        <IconClose className="h-4 w-4" />
      </button>
    </div>
  );
}

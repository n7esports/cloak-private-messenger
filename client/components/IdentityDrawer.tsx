"use client";

import { useMemo } from "react";
import { useVaultStore } from "../store/useVaultStore";
import { encodeBytes } from "../lib/protocol";
import BoxQRCode from "./icons/BoxQRCode";

export function IdentityDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const identity = useVaultStore((s) => s.identity);

  const publicKey = useMemo(() => {
    if (!identity) return "";
    return encodeBytes(identity.encryptionPublicKey);
  }, [identity]);

  const fingerprint = useMemo(() => {
    if (!publicKey) return "";
    return publicKey;
  }, [publicKey]);

  if (!open) return null;

  return (
    <div className="flex h-full w-full flex-col border-l border-hairline bg-surface-container">
      <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
        <div>
          <h3 className="font-sans text-base font-semibold text-on-surface">
            Identity
          </h3>
          <p className="text-xs text-on-surface-variant">AUDIT BOT • E2EE BOT LINK</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-on-surface-variant transition hover:bg-surface-high hover:text-on-surface"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {identity && (
          <div className="flex flex-col items-center gap-4">
            <BoxQRCode payload={`cloak:${publicKey}`} size={256} />

            {/* Public key */}
            <div className="w-full">
              <p className="mb-1 text-xs font-medium text-on-surface-variant">
                PUBLIC KEY • X25519
              </p>
              <div className="rounded-xl border border-hairline bg-surface px-3 py-2">
                <code className="block truncate font-mono text-[10px] text-on-surface break-all">
                  {publicKey}
                </code>
              </div>
            </div>

            {/* Session fingerprint */}
            <div className="w-full">
              <p className="mb-1 text-xs font-medium text-on-surface-variant">
                SESSION FINGERPRINT • SHA-256
              </p>
              <div className="rounded-xl border border-hairline bg-surface px-3 py-2">
                <code className="block truncate font-mono text-[10px] text-on-surface break-all">
                  {fingerprint}
                </code>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

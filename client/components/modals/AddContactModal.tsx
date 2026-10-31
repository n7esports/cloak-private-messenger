"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import QRCode from "qrcode";
import { useChatStore } from "../../store/useChatStore";
import { useVaultStore } from "../../store/useVaultStore";
import { initCrypto } from "../../lib/crypto";
import { encodeBytes } from "../../lib/protocol";
import IconKey from "../icons/IconKey";
import IconCopy from "../icons/IconCopy";

const TAB_ALLOWED = /^[0-9a-fA-F]+$/;

export default function AddContactModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"mycode" | "add">("mycode");
  const [hexKey, setHexKey] = useState("");
  const [nickname, setNickname] = useState("");
  const [myCodeKey, setMyCodeKey] = useState<string>("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const identity = useVaultStore((s) => s.identity);
  const addContact = useChatStore((s) => s.addContact);
  const showToast = useChatStore((s) => s.showToast);

  // Generate "My Code" QR whenever identity is available
  useEffect(() => {
    if (!open || tab !== "mycode" || !identity) return;
    let cancelled = false;
    (async () => {
      const sodium = await initCrypto();
      const hex = encodeBytes(identity.encryptionPublicKey);
      const payload = `cloak:${hex}`;
      setMyCodeKey(hex);
      // Draw rounded-dot QR to canvas
      const canvas = canvasRef.current;
      if (!canvas) return;
      const size = 256;
      const moduleCount = 25;
      const margin = 2;
      const totalModules = moduleCount + margin * 2;
      const cellSize = size / totalModules;
      const dotRadius = cellSize * 0.45;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      // Background
      const surface = getComputedStyle(document.documentElement)
        .getPropertyValue("--surface")
        .trim();
      ctx.fillStyle = surface;
      ctx.fillRect(0, 0, size, size);
      // Generate QR matrix
      const qr = QRCode.create(payload, {
        errorCorrectionLevel: "H",
        margin,
      } as any);
      const modules = qr.modules.data;
      const qrSize = qr.modules.size;
      const primary = getComputedStyle(document.documentElement)
        .getPropertyValue("--primary")
        .trim();
      ctx.fillStyle = primary;
      for (let row = 0; row < qrSize; row++) {
        for (let col = 0; col < qrSize; col++) {
          if (modules[row * qrSize + col]) {
            const cx = (col + margin) * cellSize + cellSize / 2;
            const cy = (row + margin) * cellSize + cellSize / 2;
            ctx.beginPath();
            ctx.arc(cx, cy, dotRadius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      // Convert canvas to data URL for img fallback / preview
      const url = canvas.toDataURL("image/png");
      if (!cancelled) setQrDataUrl(url);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, tab, identity]);

  // Reset when opening
  useEffect(() => {
    if (open) {
      setTab("mycode");
      setHexKey("");
      setNickname("");
      setCopied(false);
      setSaving(false);
    }
  }, [open]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(myCodeKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }, [myCodeKey]);

  const handleSaveContact = async () => {
    const trimmed = hexKey.trim().replace(/^cloak:/i, "");
    if (!TAB_ALLOWED.test(trimmed) || trimmed.length !== 64) {
      showToast({
        id: crypto.randomUUID(),
        message: "Enter a valid 256-bit hex key.",
        type: "info",
      });
      return;
    }
    if (!nickname.trim()) {
      showToast({
        id: crypto.randomUUID(),
        message: "Enter a nickname.",
        type: "info",
      });
      return;
    }
    setSaving(true);
    try {
      const chat = await addContact(nickname.trim(), trimmed);
      showToast({
        id: crypto.randomUUID(),
        message: `Contact "${chat.alias}" added.`,
        type: "success",
      });
      onClose();
    } catch (err) {
      showToast({
        id: crypto.randomUUID(),
        message: err instanceof Error ? err.message : "Could not add contact.",
        type: "info",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex w-full max-w-md flex-col rounded-lg border border-hairline bg-surface-container shadow-panel">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
          <h3 className="font-sans text-base font-semibold text-on-surface">
            Add Contact
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-hairline px-4">
          <button
            onClick={() => setTab("mycode")}
            className={`flex-1 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
              tab === "mycode"
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            My Code
          </button>
          <button
            onClick={() => setTab("add")}
            className={`flex-1 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
              tab === "add"
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Add Contact
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {tab === "mycode" && (
            <div className="flex flex-col items-center gap-4">
              {/* QR with center IconKey */}
              <div className="relative rounded-xl border border-hairline bg-surface-container p-3">
                {identity && (
                  <div className="relative">
                    <canvas
                      ref={canvasRef}
                      className="block h-48 w-48 rounded-lg"
                      style={{ imageRendering: "pixelated" }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface/90">
                        <IconKey
                          size={20}
                          className="text-primary"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Hex key + copy */}
              {myCodeKey && (
                <div className="flex w-full items-center gap-2 rounded-xl border border-hairline bg-surface-container px-3 py-2">
                  <code className="flex-1 truncate font-mono text-xs text-on-surface">
                    {myCodeKey}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="rounded-lg p-1.5 text-primary transition hover:bg-surface-high"
                  >
                    <IconCopy size={16} />
                  </button>
                </div>
              )}
              {copied && (
                <p className="text-xs text-primary">Copied to clipboard.</p>
              )}
            </div>
          )}

          {tab === "add" && (
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-on-surface-variant">
                  Contact Public Key (hex)
                </span>
                <div className="flex gap-2">
                  <input
                    value={hexKey}
                    onChange={(e) => setHexKey(e.target.value)}
                    placeholder="64-char hex key"
                    className="flex-1 rounded-xl border border-hairline bg-surface-container px-3 py-2.5 font-mono text-sm text-on-surface outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => alert("QR scanning would open the device camera here.")}
                    className="rounded-xl border border-hairline bg-surface-container px-3 py-2.5 text-on-surface-variant transition hover:border-primary hover:text-primary"
                    title="Scan QR Code"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" />
                      <path d="M21 14v3a2 2 0 0 1-2 2h-3" />
                      <path d="M14 21h-3a2 2 0 0 1-2-2v-3" />
                    </svg>
                  </button>
                </div>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-on-surface-variant">
                  Nickname
                </span>
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="How you know them"
                  className="w-full rounded-xl border border-hairline bg-surface-container px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary"
                />
              </label>

              <button
                onClick={handleSaveContact}
                disabled={saving}
                className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-on-primary transition hover:bg-primary/90 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Contact"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

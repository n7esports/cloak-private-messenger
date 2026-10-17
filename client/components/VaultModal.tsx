"use client";

import { useState, useEffect, useCallback } from "react";
import { useVaultStore } from "../store/useVaultStore";
import { useChatStore } from "../store/useChatStore";
import {
  IconClose,
  IconKey,
  IconCopy,
  IconCheck,
  IconShare,
  IconShield,
  IconLock,
  IconQrCode,
  IconPersonAdd,
  IconVerified,
} from "./icons/UiIcons";

interface VaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "pubkey" | "addcontact";
}

export function VaultModal({
  isOpen,
  onClose,
  initialTab = "pubkey",
}: VaultModalProps) {
  const [activeTab, setActiveTab] = useState<"pubkey" | "addcontact">(initialTab);
  const [copied, setCopied] = useState(false);

  // Form states for Add Contact
  const [contactName, setContactName] = useState("");
  const [contactKey, setContactKey] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [laserPos, setLaserPos] = useState(10);
  const [scannerStatus, setScannerStatus] = useState<"idle" | "scanning" | "success">("idle");

  const { identity } = useVaultStore();
  const { addContact, showToast } = useChatStore();

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  // Optical scanner simulation
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isScanning) {
      let pos = 10;
      let dir = 1;
      interval = setInterval(() => {
        pos += dir * 8;
        if (pos >= 120) dir = -1;
        if (pos <= 8) dir = 1;
        setLaserPos(pos);
      }, 40);

      const timeout = setTimeout(() => {
        setIsScanning(false);
        setScannerStatus("success");
        if (!contactName) setContactName("Cipher Operative 7");
        setContactKey("f8c2e19a4d7b304c5e6f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d");
        showToast({
          id: crypto.randomUUID(),
          message: "Public key decoded from optical ingress payload",
          icon: "qr_code_scanner",
        });
      }, 2200);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [isScanning, contactName, showToast]);

  const copyPublicKey = useCallback(() => {
    const rawKey = identity
      ? Array.from(identity.encryptionPublicKey)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
      : "a3f7b2d9e4c1f8a5b6d3e7f9c2a4b8d1e5f7a3c6b9d2e4f8a1c3b5d7e9f2a4c6";
    navigator.clipboard?.writeText(rawKey);
    setCopied(true);
    showToast({
      id: crypto.randomUUID(),
      message: "Public key copied to clipboard",
      icon: "content_copy",
    });
    setTimeout(() => setCopied(false), 2200);
  }, [identity, showToast]);

  const sharePublicKey = useCallback(() => {
    const key = identity
      ? Array.from(identity.encryptionPublicKey)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
      : "a3f7b2d9e4c1f8a5b6d3e7f9c2a4b8d1e5f7a3c6b9d2e4f8a1c3b5d7e9f2a4c6";
    if (navigator.share) {
      navigator
        .share({ title: "Cloak Identity Key", text: key })
        .catch(() => copyPublicKey());
    } else {
      copyPublicKey();
    }
  }, [identity, copyPublicKey]);

  const isFormValid = contactName.trim().length >= 2 && contactKey.trim().length >= 8;

  const handleConfirmAdd = useCallback(async () => {
    if (!isFormValid) return;
    try {
      await addContact(contactName.trim(), contactKey.trim());
      showToast({
        id: crypto.randomUUID(),
        message: `Session established with ${contactName.trim()}`,
        icon: "person_add",
      });
      setContactName("");
      setContactKey("");
      setScannerStatus("idle");
      setActiveTab("pubkey");
    } catch (error) {
      showToast({
        id: crypto.randomUUID(),
        message: error instanceof Error ? error.message : "Failed to add contact",
        icon: "error",
      });
    }
  }, [isFormValid, addContact, contactName, contactKey, showToast]);

  if (!isOpen) return null;

  const publicKeyHex = identity
    ? Array.from(identity.encryptionPublicKey)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    : "a3f7b2d9e4c1f8a5b6d3e7f9c2a4b8d1e5f7a3c6b9d2e4f8a1c3b5d7e9f2a4c6";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-container-lowest/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[480px] bg-surface-container-low/95 backdrop-blur-2xl rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.65)] overflow-hidden flex flex-col border border-surface-container-high/60 animate-in zoom-in-95 duration-200"
      >
        {/* Modal Top Bar */}
        <div className="px-space-lg pt-space-lg pb-space-sm flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            <span className="font-label-code-sm text-label-code-sm text-on-surface-variant uppercase tracking-widest font-mono">
              Vault Identity Relay
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close exchange modal"
            className="w-8 h-8 rounded-full flex items-center justify-center bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            type="button"
          >
            <IconClose width={18} height={18} />
          </button>
        </div>

        {/* Segmented Dual Tabs Switcher */}
        <div className="px-space-lg pt-space-xs">
          <div className="grid grid-cols-2 p-1 rounded-xl bg-surface-container-lowest/90 border border-surface-container-high/30">
            <button
              onClick={() => setActiveTab("pubkey")}
              type="button"
              className={`py-2 px-3 rounded-lg font-headline-sm text-headline-sm transition-all duration-200 text-center flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "pubkey"
                  ? "bg-surface-container-high text-primary shadow-sm font-semibold"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <IconKey width={18} height={18} />
              <span>My Public Key</span>
            </button>
            <button
              onClick={() => setActiveTab("addcontact")}
              type="button"
              className={`py-2 px-3 rounded-lg font-headline-sm text-headline-sm transition-all duration-200 text-center flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "addcontact"
                  ? "bg-surface-container-high text-primary shadow-sm font-semibold"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <IconPersonAdd width={18} height={18} />
              <span>Add Contact</span>
            </button>
          </div>
        </div>

        {/* TAB 1: My Public Key Content */}
        {activeTab === "pubkey" && (
          <div className="flex flex-col p-space-lg gap-space-md">
            {/* Header Badge Status */}
            <div className="flex items-center justify-between px-space-md py-space-xs rounded-xl bg-surface-container/70 shadow-sm border border-surface-container-high/40">
              <div className="flex items-center gap-space-xs">
                <IconVerified width={20} height={20} className="text-primary" />
                <span className="font-headline-sm text-headline-sm text-on-surface">
                  Identity Ratchet Active
                </span>
              </div>
              <span className="font-label-code-sm text-label-code-sm text-primary uppercase font-mono tracking-wider font-semibold">
                ED25519
              </span>
            </div>

            {/* QR Matrix Presentation */}
            <div className="relative mx-auto p-4 rounded-xl bg-surface-container-lowest shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col items-center justify-center border border-surface-container-high/40">
              <div className="absolute inset-0 bg-primary/10 rounded-xl blur-xl pointer-events-none" />
              <div className="relative w-48 h-48 sm:w-52 sm:h-52 bg-surface-container-lowest rounded-lg p-2 flex items-center justify-center">
                <IconQrCode className="w-full h-full text-primary" />
              </div>
              <span className="font-label-code-sm text-label-code-sm text-outline-variant mt-2 tracking-wider font-mono">REF: M-25519-RATCHET</span>
            </div>

            {/* Raw 256-bit Hex Public Key Display */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-label-code-sm text-label-code-sm text-on-surface-variant uppercase tracking-wider font-semibold font-mono">Raw Master Key (256-bit)</span>
                <span className="font-label-code-sm text-label-code-sm text-secondary font-mono">64 BYTES</span>
              </div>
              <div className="relative group p-space-sm rounded-xl bg-surface-container-lowest/90 shadow-sm flex items-center justify-between gap-2 border border-surface-container-high/40">
                <code className="font-label-code-sm text-label-code-sm text-on-surface font-mono select-all break-all leading-relaxed">
                  <span className="text-primary font-semibold">{publicKeyHex.slice(0, 16)}</span>{" "}
                  <span className="text-on-surface-variant">{publicKeyHex.slice(16, 32)}</span>{" "}
                  <span className="text-on-surface">{publicKeyHex.slice(32, 48)}</span>{" "}
                  <span className="text-tertiary">{publicKeyHex.slice(48, 64)}</span>
                </code>
                <button onClick={copyPublicKey} aria-label="Copy key" className="p-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface transition-all flex items-center justify-center flex-shrink-0 cursor-pointer" type="button">
                  {copied ? <IconCheck width={18} height={18} className="text-primary" /> : <IconCopy width={18} height={18} />}
                </button>
              </div>
            </div>

            {/* Visual Safety Fingerprint 8x4 Grid */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-label-code-sm text-label-code-sm text-on-surface-variant uppercase tracking-wider font-semibold font-mono">
                  Visual Key Fingerprint
                </span>
                <span className="font-label-code-sm text-label-code-sm text-outline font-mono">
                  8x4 HASH BLOCKS
                </span>
              </div>
              <div className="grid grid-cols-8 gap-1.5 p-2 rounded-xl bg-surface-container-lowest/60 border border-surface-container-high/30">
                {Array.from({ length: 32 }, (_, i) => (
                  <div key={i} className={`h-4 rounded ${["bg-primary", "bg-secondary", "bg-tertiary"][i % 3]}`} />
                ))}
              </div>
            </div>

            {/* Share Key CTA Button */}
            <button
              onClick={sharePublicKey}
              type="button"
              className="w-full mt-1 py-3 px-space-md rounded-full bg-primary hover:bg-secondary text-on-primary font-headline-sm text-headline-sm font-semibold shadow-[0_0_20px_rgba(78,222,163,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <IconShare width={20} height={20} />
              <span>Share Identity Key</span>
            </button>
          </div>
        )}

        {/* TAB 2: Add Contact Content */}
        {activeTab === "addcontact" && (
          <div className="flex flex-col p-space-lg gap-space-md">
            {/* Contact Name Input */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  className="font-label-code-sm text-label-code-sm text-on-surface-variant uppercase tracking-wider font-semibold font-mono"
                  htmlFor="contactNameInput"
                >
                  Contact Alias / Handle
                </label>
                <span className="font-label-code-sm text-label-code-sm text-outline font-mono">
                  {contactName.trim().length >= 2 ? "Validated" : "Min 2 chars"}
                </span>
              </div>
              <div className="relative flex items-center">
                <IconPersonAdd
                  width={20}
                  height={20}
                  className="absolute left-3.5 text-on-surface-variant pointer-events-none"
                />
                <input
                  id="contactNameInput"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full bg-surface-container-lowest/80 text-on-surface placeholder:text-on-surface-variant/50 font-body-md text-body-md pl-11 pr-10 py-3 rounded-xl outline-none shadow-sm transition-all focus:bg-surface-container-lowest border border-surface-container-high/40 focus:border-primary/40"
                  placeholder="e.g. Vesper Lyra or 0xNode"
                  type="text"
                />
                {contactName.trim().length >= 2 && (
                  <IconCheck
                    width={20}
                    height={20}
                    className="absolute right-3 text-primary pointer-events-none"
                  />
                )}
              </div>
            </div>

            {/* Public Key Input */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  className="font-label-code-sm text-label-code-sm text-on-surface-variant uppercase tracking-wider font-semibold font-mono"
                  htmlFor="contactKeyInput"
                >
                  Public Key or Cloak Address
                </label>
                <span className="font-label-code-sm text-label-code-sm text-primary font-mono">
                  HEX OR TOR
                </span>
              </div>
              <div className="relative flex items-center">
                <IconShield
                  width={20}
                  height={20}
                  className="absolute left-3.5 text-on-surface-variant pointer-events-none"
                />
                <input
                  id="contactKeyInput"
                  value={contactKey}
                  onChange={(e) => setContactKey(e.target.value)}
                  className="w-full bg-surface-container-lowest/80 text-on-surface placeholder:text-on-surface-variant/50 font-label-code-sm text-label-code-sm pl-11 pr-3 py-3 rounded-xl outline-none shadow-sm transition-all focus:bg-surface-container-lowest font-mono border border-surface-container-high/40 focus:border-primary/40"
                  placeholder="Paste 64-char hex key or address..."
                  type="text"
                />
              </div>
            </div>

            {/* Optical Key Scanner */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-label-code-sm text-label-code-sm text-on-surface-variant uppercase tracking-wider font-semibold font-mono">
                  Optical Key Scanner
                </span>
                <span
                  className={`font-label-code-sm text-label-code-sm uppercase font-mono ${
                    isScanning
                      ? "text-primary animate-pulse"
                      : scannerStatus === "success"
                      ? "text-secondary"
                      : "text-outline"
                  }`}
                >
                  {isScanning
                    ? "Scanning Viewport"
                    : scannerStatus === "success"
                    ? "Key Extracted"
                    : "Camera Standby"}
                </span>
              </div>

              {/* Viewfinder Box with Laser Simulation */}
              <div className="relative w-full h-36 rounded-xl bg-surface-container-lowest/90 overflow-hidden flex flex-col items-center justify-center shadow-inner border border-surface-container-high/50">
                {["top-2.5 left-2.5 border-t-2 border-l-2", "top-2.5 right-2.5 border-t-2 border-r-2", "bottom-2.5 left-2.5 border-b-2 border-l-2", "bottom-2.5 right-2.5 border-b-2 border-r-2"].map((pos) => (
                  <div key={pos} className={`absolute ${pos} w-4 h-4 rounded-sm border-primary/60 pointer-events-none`} />
                ))}
                {isScanning && (
                  <div style={{ top: `${laserPos}px` }} className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_12px_#4edea3] z-10 transition-all duration-75" />
                )}
                {isScanning ? (
                  <div className="flex flex-col items-center gap-1 text-center">
                    <IconQrCode width={28} height={28} className="text-primary animate-pulse" />
                    <span className="font-label-code-sm text-label-code-sm text-primary font-mono font-semibold">DECODING INGRESS PAYLOAD...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 p-space-sm text-center">
                    <IconQrCode width={32} height={32} className="text-on-surface-variant" />
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Align peer&apos;s Cloak QR code within frame</p>
                    <button type="button" onClick={() => setIsScanning(true)} className="mt-1 px-4 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-code-sm text-label-code-sm transition-colors flex items-center gap-1.5 cursor-pointer">
                      <IconShield width={16} height={16} className="text-primary" />
                      <span>Activate Camera</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Add Contact Primary CTA */}
            <button
              onClick={handleConfirmAdd}
              disabled={!isFormValid}
              type="button"
              className={`w-full mt-2 py-3 px-space-md rounded-full font-headline-sm text-headline-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                isFormValid
                  ? "bg-primary hover:bg-secondary text-on-primary shadow-[0_0_20px_rgba(78,222,163,0.3)] cursor-pointer active:scale-[0.98]"
                  : "bg-surface-container-highest text-on-surface-variant cursor-not-allowed shadow-sm"
              }`}
            >
              <IconPersonAdd width={20} height={20} />
              <span>Establish Cryptographic Channel</span>
            </button>
          </div>
        )}

        {/* Modal Footer Status */}
        <div className="px-space-lg py-2.5 bg-surface-container-lowest/70 flex items-center justify-between text-on-surface-variant border-t border-surface-container-high/30">
          <div className="flex items-center gap-1.5">
            <IconLock width={14} height={14} className="text-primary" />
            <span className="font-label-code-sm text-label-code-sm font-mono">
              Zero Metadata Kept
            </span>
          </div>
          <span className="font-label-code-sm text-label-code-sm text-secondary font-mono">
            LOCAL PROTOCOL v4.8
          </span>
        </div>
      </div>
    </div>
  );
}

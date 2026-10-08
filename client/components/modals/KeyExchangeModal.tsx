"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import QRCode from "qrcode";
import type { IdentityKeys } from "../../lib/crypto";
import type { ChatSummary } from "../../store/useChatStore";

type ExchangeTab = "share" | "add";

interface KeyExchangeModalProps {
  identity: IdentityKeys;
  onClose: () => void;
  onContactAdded: (alias: string, publicKey: string) => Promise<ChatSummary>;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBase64(value: string): string {
  const bytes = Uint8Array.from(
    value.match(/.{2}/g) ?? [],
    (byte) => Number.parseInt(byte, 16),
  );
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function parsePublicKey(value: string): string | null {
  const normalized = value.trim().replace(/^cloak:/i, "");
  return /^[0-9a-f]{64}$/i.test(normalized) ? normalized.toLowerCase() : null;
}

export default function KeyExchangeModal({
  identity,
  onClose,
  onContactAdded,
}: KeyExchangeModalProps) {
  const publicKey = toHex(identity.encryptionPublicKey);
  const [tab, setTab] = useState<ExchangeTab>("share");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [contactKey, setContactKey] = useState("");
  const [alias, setAlias] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(publicKey, {
      errorCorrectionLevel: "H",
      color: { dark: "#000000", light: "#ffffff" },
      margin: 4,
      width: 320,
    })
      .then((dataUrl) => {
        if (active) setQrDataUrl(dataUrl);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error ? cause.message : "Could not generate the QR code.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [publicKey]);

  useEffect(() => {
    if (!cameraActive) return;
    let animationFrame = 0;
    let disposed = false;
    const stream = streamRef.current;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    let lastScanAt = 0;

    if (!stream || !video || !context) return;
    video.srcObject = stream;
    void video.play().catch((cause: unknown) => {
      setError(
        cause instanceof Error ? cause.message : "Could not start the camera preview.",
      );
    });

    const scanFrame = (timestamp: number) => {
      if (disposed) return;
      if (
        timestamp - lastScanAt >= 200 &&
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
      ) {
        lastScanAt = timestamp;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const image = context.getImageData(0, 0, canvas.width, canvas.height);
        const result = jsQR(image.data, image.width, image.height, {
          inversionAttempts: "attemptBoth",
        });
        if (result) {
          const key = parsePublicKey(result.data);
          if (key) {
            setContactKey(key);
            streamRef.current?.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
            setCameraActive(false);
            setError("");
            return;
          }
          streamRef.current?.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          setCameraActive(false);
          setError("The scanned QR code does not contain a Cloak public key.");
          return;
        }
      }
      animationFrame = window.requestAnimationFrame(scanFrame);
    };

    animationFrame = window.requestAnimationFrame(scanFrame);
    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      video.srcObject = null;
    };
  }, [cameraActive]);

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    },
    [],
  );

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
  }

  async function startCamera() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera scanning is unavailable in this browser. Enter the key or upload a QR image.");
      return;
    }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      });
      setCameraActive(true);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Camera access was denied.",
      );
    }
  }

  async function readQrImage(file: File) {
    setError("");
    try {
      const image = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Could not read the selected image.");
      context.drawImage(image, 0, 0);
      image.close();
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(pixels.data, pixels.width, pixels.height, {
        inversionAttempts: "attemptBoth",
      });
      const key = result ? parsePublicKey(result.data) : null;
      if (!key) {
        throw new Error("No valid Cloak public-key QR code was found in that image.");
      }
      setContactKey(key);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not read the QR image.",
      );
    }
  }

  async function copyKey() {
    setError("");
    try {
      await navigator.clipboard.writeText(publicKey);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not copy the public key.",
      );
    }
  }

  async function shareQr() {
    if (!qrDataUrl) return;
    setError("");
    try {
      const response = await fetch(qrDataUrl);
      const image = await response.blob();
      const file = new File([image], "cloak-public-key.png", {
        type: "image/png",
      });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: "Cloak public key", files: [file] });
      } else if (navigator.share) {
        await navigator.share({ title: "Cloak public key", text: publicKey });
      } else {
        throw new Error("Sharing is not supported by this browser. Use Save QR or Copy Key.");
      }
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(
        cause instanceof Error ? cause.message : "Could not share the QR code.",
      );
    }
  }

  async function addContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const key = parsePublicKey(contactKey);
    if (!key) {
      setError("Enter a valid 64-character hexadecimal public key.");
      return;
    }
    setWorking(true);
    try {
      await onContactAdded(alias, hexToBase64(key));
      stopCamera();
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not add this contact.",
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/80 px-4 py-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="key-exchange-title"
        className="max-h-full w-full max-w-lg overflow-y-auto rounded-xl border border-cloak-border bg-cloak-surface-1 p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="key-exchange-title" className="text-lg font-semibold">
              Key &amp; Contact Exchange
            </h2>
            <p className="mt-2 text-sm leading-6 text-cloak-muted">
              Share only your public encryption key. Never share your recovery
              phrase or private keys.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close key exchange"
            className="min-h-10 rounded-lg border border-cloak-border px-3 text-sm"
          >
            Close
          </button>
        </div>

        <div className="mt-5 flex gap-2 border-b border-cloak-border">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setTab("share");
              setError("");
            }}
            aria-pressed={tab === "share"}
            className={`min-h-10 border-b-2 px-3 text-sm ${
              tab === "share"
                ? "border-cloak-accent text-cloak-accent"
                : "border-transparent text-cloak-muted"
            }`}
          >
            My Public Key
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("add");
              setError("");
            }}
            aria-pressed={tab === "add"}
            className={`min-h-10 border-b-2 px-3 text-sm ${
              tab === "add"
                ? "border-cloak-accent text-cloak-accent"
                : "border-transparent text-cloak-muted"
            }`}
          >
            Add Contact
          </button>
        </div>

        {tab === "share" ? (
          <div className="pt-5">
            <p className="text-xs font-medium uppercase tracking-wider text-cloak-muted">
              256-bit encryption public key
            </p>
            <code className="mt-2 block break-all rounded-lg border border-cloak-border bg-cloak-base p-3 font-mono text-xs leading-5">
              {publicKey}
            </code>
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR code for your public encryption key"
                className="mx-auto mt-5 h-64 w-64 border-8 border-white bg-white"
              />
            ) : (
              <p role="status" className="mt-5 text-center text-sm text-cloak-muted">
                Generating QR code…
              </p>
            )}
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => void copyKey()}
                className="min-h-11 rounded-lg border border-cloak-border px-4 text-sm"
              >
                Copy Key
              </button>
              <a
                href={qrDataUrl || undefined}
                download="cloak-public-key.png"
                aria-disabled={!qrDataUrl}
                className="inline-flex min-h-11 items-center rounded-lg border border-cloak-border px-4 text-sm"
              >
                Save QR
              </a>
              <button
                type="button"
                onClick={() => void shareQr()}
                disabled={!qrDataUrl}
                className="min-h-11 rounded-lg bg-cloak-accent px-4 text-sm font-semibold text-cloak-base disabled:opacity-50"
              >
                Share QR
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={addContact} className="pt-5">
            <label htmlFor="exchange-alias" className="mb-2 block text-sm">
              Contact name
            </label>
            <input
              id="exchange-alias"
              value={alias}
              onChange={(event) => setAlias(event.target.value)}
              autoComplete="off"
              className="w-full rounded-lg border border-cloak-border bg-cloak-base px-3 py-3 text-sm outline-none focus:border-cloak-accent focus:ring-2 focus:ring-cloak-accent/30"
            />
            <label htmlFor="exchange-key" className="mb-2 mt-4 block text-sm">
              Public key (64 hexadecimal characters)
            </label>
            <textarea
              id="exchange-key"
              required
              rows={3}
              value={contactKey}
              onChange={(event) => setContactKey(event.target.value.trim())}
              autoComplete="off"
              spellCheck={false}
              className="w-full resize-y rounded-lg border border-cloak-border bg-cloak-base px-3 py-3 font-mono text-xs outline-none focus:border-cloak-accent focus:ring-2 focus:ring-cloak-accent/30"
            />
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  if (cameraActive) stopCamera();
                  else void startCamera();
                }}
                className="min-h-10 rounded-lg border border-cloak-border px-3 text-sm"
              >
                {cameraActive ? "Stop camera" : "Scan with camera"}
              </button>
              <label className="inline-flex min-h-10 cursor-pointer items-center rounded-lg border border-cloak-border px-3 text-sm">
                Upload from Gallery
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void readQrImage(file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
            {cameraActive && (
              <video
                ref={videoRef}
                muted
                playsInline
                aria-label="Camera scanning for a contact QR code"
                className="mt-4 max-h-64 w-full rounded-lg bg-black object-contain"
              />
            )}
            {error && (
              <p role="alert" className="mt-3 text-sm text-cloak-danger">
                {error}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className="min-h-11 rounded-lg border border-cloak-border px-4 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={working}
                className="min-h-11 rounded-lg bg-cloak-accent px-4 text-sm font-semibold text-cloak-base disabled:opacity-50"
              >
                {working ? "Adding…" : "Add contact"}
              </button>
            </div>
          </form>
        )}
        {tab === "share" && error && (
          <p role="alert" className="mt-3 text-sm text-cloak-danger">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { parseInvitation } from "../lib/websocketClient";

const overlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 20,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  background: "rgba(2, 6, 23, .78)",
};

const panelStyle = {
  boxSizing: "border-box",
  width: "100%",
  maxWidth: 520,
  padding: 24,
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 12,
  color: "#f8fafc",
};

const tabStyle = (selected) => ({
  flex: 1,
  padding: "10px 8px",
  border: "1px solid #334155",
  borderRadius: 6,
  background: selected ? "#6366f1" : "#1e293b",
  color: "#fff",
  cursor: "pointer",
});

export default function JoinModal({ open, client, onClose }) {
  const [activeTab, setActiveTab] = useState("code");
  const [invitation, setInvitation] = useState("");
  const [error, setError] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const videoRef = useRef(null);
  const scanHandledRef = useRef(false);

  const connectToInvitation = useCallback(async (value) => {
    setError("");
    setIsConnecting(true);

    try {
      const { queueId, pubKey } = parseInvitation(value);
      if (!client) throw new Error("The secure client is not ready.");

      await client.acceptInvitation(queueId, pubKey);
      client.startPolling(2000);
      onClose();
    } catch (connectionError) {
      setError(
        connectionError instanceof Error
          ? connectionError.message
          : "Unable to connect to this invitation."
      );
      throw connectionError;
    } finally {
      setIsConnecting(false);
    }
  }, [client, onClose]);

  async function handleConnect(event) {
    event.preventDefault();
    try {
      await connectToInvitation(invitation);
    } catch {
      // The inline error is set by connectToInvitation.
    }
  }

  useEffect(() => {
    if (!open || activeTab !== "scan") return undefined;

    let cancelled = false;
    let controls;
    scanHandledRef.current = false;
    setError("");

    async function startScanner() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera access is not available in this browser.");
        }

        const { BrowserQRCodeReader } = await import("@zxing/browser");
        if (cancelled) return;

        const reader = new BrowserQRCodeReader();
        const scannerControls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          async (result) => {
            if (!result || scanHandledRef.current || cancelled) return;
            scanHandledRef.current = true;
            const scannedText = result.getText();
            setInvitation(scannedText);
            try {
              await connectToInvitation(scannedText);
            } catch {
              scanHandledRef.current = false;
            }
          }
        );
        if (cancelled) {
          scannerControls.stop();
        } else {
          controls = scannerControls;
        }
      } catch (cameraError) {
        if (!cancelled) {
          setError(
            cameraError instanceof Error
              ? cameraError.message
              : "Unable to start the camera. Check camera permissions."
          );
        }
      }
    }

    startScanner();

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [open, activeTab, connectToInvitation]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={overlayStyle}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-session-title"
        onClick={(event) => event.stopPropagation()}
        style={panelStyle}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <h2 id="join-session-title" style={{ margin: 0 }}>
            Add Person by Code or QR
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              border: 0,
              background: "transparent",
              color: "#cbd5e1",
              fontSize: 24,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, margin: "20px 0" }}>
          <button
            type="button"
            onClick={() => setActiveTab("code")}
            aria-pressed={activeTab === "code"}
            style={tabStyle(activeTab === "code")}
          >
            Enter Code / Link
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("scan")}
            aria-pressed={activeTab === "scan"}
            style={tabStyle(activeTab === "scan")}
          >
            Scan QR Code
          </button>
        </div>

        {activeTab === "code" ? (
          <form onSubmit={handleConnect}>
            <label
              htmlFor="invitation-code"
              style={{
                display: "block",
                marginBottom: 8,
                color: "#cbd5e1",
                fontSize: 14,
              }}
            >
              Paste an invitation link or queueId=…&amp;pubKey=…
            </label>
            <textarea
              id="invitation-code"
              value={invitation}
              onChange={(event) => setInvitation(event.target.value)}
              rows={4}
              autoFocus
              style={{
                boxSizing: "border-box",
                width: "100%",
                padding: 10,
                resize: "vertical",
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: 6,
                color: "#f8fafc",
              }}
            />
            <button
              type="submit"
              disabled={isConnecting}
              style={{
                width: "100%",
                marginTop: 12,
                padding: 11,
                border: 0,
                borderRadius: 6,
                background: "#6366f1",
                color: "#fff",
                cursor: isConnecting ? "wait" : "pointer",
              }}
            >
              {isConnecting ? "Connecting…" : "Connect"}
            </button>
          </form>
        ) : (
          <div>
            <p style={{ color: "#94a3b8", fontSize: 14 }}>
              Allow camera access and hold a Cloak invitation QR code in view.
            </p>
            <video
              ref={videoRef}
              muted
              playsInline
              aria-label="QR code camera preview"
              style={{
                display: "block",
                width: "100%",
                maxHeight: 320,
                background: "#020617",
                borderRadius: 8,
                objectFit: "cover",
              }}
            />
          </div>
        )}

        {error && (
          <div
            role="alert"
            style={{
              marginTop: 14,
              padding: 10,
              borderRadius: 6,
              background: "rgba(127, 29, 29, .3)",
              color: "#fca5a5",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}
      </section>
    </div>
  );
}

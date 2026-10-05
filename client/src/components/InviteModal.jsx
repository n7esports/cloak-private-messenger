import { useEffect, useState } from "react";

export default function InviteModal({ open, inviteLink, onClose }) {
  const [qrCode, setQrCode] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !inviteLink) return undefined;

    let cancelled = false;
    setQrCode("");
    setError("");

    import("qrcode")
      .then((QRCode) =>
        QRCode.toDataURL(inviteLink, {
          errorCorrectionLevel: "M",
          margin: 2,
          width: 240,
          color: {
            dark: "#0f172a",
            light: "#ffffff",
          },
        })
      )
      .then((dataUrl) => {
        if (!cancelled) setQrCode(dataUrl);
      })
      .catch((qrError) => {
        if (!cancelled) {
          setError(
            qrError instanceof Error
              ? qrError.message
              : "Unable to generate an invitation QR code."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, inviteLink]);

  if (!open) return null;

  async function copyInvitation() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
    } catch {
      setError("Unable to copy the invitation link.");
    }
  }

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "rgba(2, 6, 23, .78)",
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="invitation-title"
        onClick={(event) => event.stopPropagation()}
        style={{
          boxSizing: "border-box",
          width: "100%",
          maxWidth: 520,
          padding: 24,
          background: "#0f172a",
          border: "1px solid #334155",
          borderRadius: 12,
          color: "#f8fafc",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 id="invitation-title" style={{ margin: 0 }}>
            New Invitation
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
        <p style={{ color: "#94a3b8", fontSize: 14 }}>
          Share the link or scan this QR code to join the private session.
        </p>
        {qrCode ? (
          <img
            src={qrCode}
            alt="QR code for the invitation link"
            width="240"
            height="240"
            style={{
              display: "block",
              width: 240,
              height: 240,
              maxWidth: "100%",
              margin: "16px auto",
              borderRadius: 6,
            }}
          />
        ) : (
          <div
            aria-live="polite"
            style={{
              width: 240,
              height: 240,
              maxWidth: "100%",
              margin: "16px auto",
              display: "grid",
              placeItems: "center",
              background: "#1e293b",
              borderRadius: 6,
              color: "#94a3b8",
              fontSize: 13,
            }}
          >
            Generating QR code…
          </div>
        )}
        <input
          aria-label="Invitation link"
          readOnly
          value={inviteLink}
          onFocus={(event) => event.currentTarget.select()}
          style={{
            boxSizing: "border-box",
            width: "100%",
            padding: 10,
            background: "#1e293b",
            border: "1px solid #334155",
            color: "#cbd5e1",
            borderRadius: 6,
            fontSize: 12,
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 10,
            marginTop: 14,
          }}
        >
          <button
            type="button"
            onClick={copyInvitation}
            style={{
              padding: "10px 16px",
              border: 0,
              borderRadius: 6,
              background: "#6366f1",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 16px",
              border: "1px solid #334155",
              borderRadius: 6,
              background: "transparent",
              color: "#cbd5e1",
              cursor: "pointer",
            }}
          >
            Done
          </button>
        </div>
        {error && (
          <div
            role="alert"
            style={{ marginTop: 12, color: "#fca5a5", fontSize: 13 }}
          >
            {error}
          </div>
        )}
      </section>
    </div>
  );
}

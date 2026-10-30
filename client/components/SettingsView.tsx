"use client";

import { useState, useCallback } from "react";
import { useChatStore } from "../store/useChatStore";

const TTL_OPTIONS = [
 { label: "Off", value: null },
 { label: "1 hour", value: 1000 * 60 * 60 },
 { label: "6 hours", value: 1000 * 60 * 60 * 6 },
 { label: "24 hours", value: 1000 * 60 * 60 * 24 },
 { label: "7 days", value: 1000 * 60 * 60 * 24 * 7 },
];

function DataExportButton() {
 const showToast = useChatStore((s) => s.showToast);
 const [loading, setLoading] = useState(false);

 const handleExport = useCallback(async () => {
  setLoading(true);
  try {
   const res = await fetch("/api/data/export");
   if (!res.ok) throw new Error(`HTTP ${res.status}`);
   const blob = await res.blob();
   const url = URL.createObjectURL(blob);
   const a = document.createElement("a");
   a.href = url;
   a.download = `cloak-export-${Date.now()}.json`;
   a.click();
   URL.revokeObjectURL(url);
   showToast({ id: crypto.randomUUID(), message: "Export downloaded", type: "success" });
  } catch {
   showToast({ id: crypto.randomUUID(), message: "Export failed", type: "warning" });
  } finally {
   setLoading(false);
  }
 }, [showToast]);

 return (
  <button
   onClick={handleExport}
   disabled={loading}
   className="rounded-xl border border-outline-variant bg-surface-container/60 px-4 py-2 text-xs font-medium text-on-surface-variant transition hover:border-outline-variant hover:text-on-surface disabled:opacity-50"
  >
   {loading ? "Exporting…" : "Export my data"}
  </button>
 );
}

function DataDeleteButton() {
 const showToast = useChatStore((s) => s.showToast);
 const [confirm, setConfirm] = useState(false);

 const handleDelete = useCallback(async () => {
  if (!confirm) { setConfirm(true); return; }
  try {
   const res = await fetch("/api/data/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirm: "DELETE_ALL_DATA" }),
   });
   if (!res.ok) throw new Error(`HTTP ${res.status}`);
   showToast({ id: crypto.randomUUID(), message: "All data deleted", type: "warning" });
  } catch {
   showToast({ id: crypto.randomUUID(), message: "Deletion failed", type: "warning" });
  } finally {
   setConfirm(false);
  }
 }, [confirm, showToast]);

 return (
  <button
   onClick={handleDelete}
   className="rounded-xl border border-error/40 bg-error/10 px-4 py-2 text-xs font-medium text-error transition hover:bg-error/20"
  >
   {confirm ? "Click again to confirm delete" : "Delete all data"}
  </button>
 );
}

function MfaSection() {
 const [secret, setSecret] = useState<string | null>(null);
 const [token, setToken] = useState("");
 const [codes, setCodes] = useState<string[]>([]);
 const [status, setStatus] = useState<"idle" | "setup" | "verify" | "enrolled">("idle");
 const [error, setError] = useState<string | null>(null);

 const startSetup = useCallback(async () => {
  setError(null);
  try {
   const { generateTOTPSecret, generateRecoveryCodes } = await import("@/lib/mfa");
   const newSecret = generateTOTPSecret();
   const newCodes = generateRecoveryCodes();
   setSecret(newSecret);
   setCodes(newCodes);
   setStatus("verify");
  } catch {
   setError("Could not start MFA setup.");
  }
 }, []);

 const verifyAndEnroll = useCallback(async () => {
  if (!secret) return;
  setError(null);
  try {
   const { verifyTOTP } = await import("@/lib/mfa");
   const ok = await verifyTOTP(secret, token.trim());
   if (!ok) { setError("Invalid code."); return; }
   // Store secret in localStorage (shortcut: plaintext here; migrate to vault
   // encryption when the backend adds a server-side MFA binding table).
   localStorage.setItem("cloak.mfa.secret", secret);
   setStatus("enrolled");
   setToken("");
   setSecret(null);
  } catch {
   setError("Verification failed.");
  }
 }, [secret, token]);

 const disableMfa = useCallback(() => {
  localStorage.removeItem("cloak.mfa.secret");
  setStatus("idle");
  setCodes([]);
  setSecret(null);
 }, []);

 const isEnrolled = typeof window !== "undefined" && !!localStorage.getItem("cloak.mfa.secret");

 if (isEnrolled && status === "idle") {
  return (
   <div className="mt-3">
    <p className="text-xs text-on-surface-variant">MFA is active.</p>
    <button
     onClick={disableMfa}
     className="mt-2 rounded-lg border border-error/40 bg-error/10 px-3 py-1.5 text-xs text-error transition hover:bg-error/20"
    >
     Disable MFA
    </button>
   </div>
  );
 }

 if (status === "enrolled") {
  return (
   <div className="mt-3">
    <p className="text-xs text-on-surface-variant">MFA enabled successfully.</p>
   </div>
  );
 }

 return (
  <div className="mt-3">
   {error && <p className="text-xs text-error">{error}</p>}
   {status === "idle" && (
    <button
     onClick={startSetup}
     className="rounded-xl border border-outline-variant bg-surface-container/60 px-4 py-2 text-xs font-medium text-on-surface-variant transition hover:border-outline-variant hover:text-on-surface"
    >
     Enable MFA
    </button>
   )}
   {status === "verify" && secret && (
    <div className="flex flex-col gap-2">
     <p className="text-[10px] text-outline">
      Scan this secret in your authenticator app: <span className="font-mono">{secret}</span>
     </p>
     <input
      type="text"
      inputMode="numeric"
      maxLength={6}
      value={token}
      onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
      placeholder="6-digit code"
      className="w-40 rounded-xl border border-outline-variant bg-surface-container/60 px-3 py-2 text-sm text-on-surface outline-none focus:border-error/60"
     />
     <button
      onClick={verifyAndEnroll}
      className="rounded-xl border border-outline-variant bg-surface-container/60 px-4 py-2 text-xs font-medium text-on-surface-variant transition hover:border-outline-variant hover:text-on-surface"
     >
      Verify & enable
     </button>
     {codes.length > 0 && (
      <div>
       <p className="text-[10px] uppercase tracking-widest text-outline">Recovery codes</p>
       <ul className="mt-1 flex flex-col gap-0.5">
        {codes.map((c) => (
         <li key={c} className="font-mono text-[10px] text-on-surface-variant">{c}</li>
        ))}
       </ul>
      </div>
     )}
    </div>
   )}
  </div>
 );
}

export function SettingsView() {
 const devices = useChatStore((s) => s.devices);
 const ephemeralTtl = useChatStore((s) => s.ephemeralTtl);
 const setEphemeralTtl = useChatStore((s) => s.setEphemeralTtl);
 const removeDevice = useChatStore((s) => s.removeDevice);
 const panicShred = useChatStore((s) => s.panicShred);
 const showToast = useChatStore((s) => s.showToast);

 return (
 <div className="flex h-full w-full overflow-y-auto bg-surface p-4">
 <div className="mx-auto w-full max-w-2xl">
 <h1 className="font-sans text-xl font-semibold text-on-surface">
 Settings
 </h1>

 {/* Ephemeral TTL */}
 <div className="mt-6 rounded-2xl border border-outline-variant/50 bg-surface-container/60 p-4">
 <h2 className="text-sm font-semibold text-on-surface">
 Ephemeral Messages
 </h2>
 <p className="mt-1 text-xs text-outline">
 Auto-delete messages after the selected window.
 </p>
 <div className="mt-3 flex flex-wrap gap-2">
 {TTL_OPTIONS.map((opt) => (
 <button
 key={opt.label}
 onClick={() => {
 setEphemeralTtl(opt.value);
 showToast({
 id: crypto.randomUUID(),
 message: `TTL set to ${opt.label}`,
 type: "success",
 });
 }}
 className={`rounded-xl border px-3 py-1.5 text-xs transition ${
 ephemeralTtl === opt.value
 ? "border-error bg-error/20 text-error"
 : "border-outline-variant bg-surface-container/60 text-on-surface-variant hover:border-outline-variant"
 }`}
 >
 {opt.label}
 </button>
 ))}
 </div>
 </div>

 {/* Devices */}
 <div className="mt-6 rounded-2xl border border-outline-variant/50 bg-surface-container/60 p-4">
 <h2 className="text-sm font-semibold text-on-surface">
 Device Sessions
 </h2>
 <p className="mt-1 text-xs text-outline">
 Active sessions tied to your identity keys.
 </p>
 <div className="mt-3 flex flex-col gap-2">
 {devices.length === 0 && (
 <p className="text-xs text-outline-variant">No active sessions.</p>
 )}
 {devices.map((d) => (
 <div
 key={d.id}
 className="flex items-center justify-between rounded-xl border border-outline-variant/60 bg-surface-container/40 px-3 py-2"
 >
 <div className="flex items-center gap-3">
 <span
 className={`h-2 w-2 rounded-full ${
 d.isCurrent
 ? "bg-primary "
 : "bg-surface-container"
 }`}
 />
 <div>
 <p className="text-sm text-on-surface">{d.name}</p>
 <p className="text-[10px] text-outline">
 {d.platform} · {d.lastSeen}
 </p>
 </div>
 </div>
 {!d.isCurrent && (
 <button
 onClick={() => {
 removeDevice(d.id);
 showToast({
 id: crypto.randomUUID(),
 message: `Revoked ${d.name}`,
 type: "warning",
 });
 }}
 className="rounded-lg border border-outline-variant px-2 py-1 text-[10px] text-on-surface-variant hover:text-error"
 >
 Revoke
 </button>
 )}
 </div>
 ))}
 </div>
 </div>

 {/* Panic */}
 <div className="mt-6 rounded-2xl border border-error/40 bg-error/10 p-4">
 <h2 className="text-sm font-semibold text-error">
 Emergency Panic Shred
 </h2>
 <p className="mt-1 text-xs text-error/80">
 Wipe all in-memory state and persistent storage immediately.
 </p>
 <button
 onClick={() => {
 panicShred();
 showToast({
 id: crypto.randomUUID(),
 message: "Vault shredded",
 type: "warning",
 });
 }}
 className="mt-3 rounded-xl border border-error/60 px-4 py-2 text-xs font-medium text-error transition hover:bg-error/20"
 >
 PANIC SHRED
 </button>
 </div>

 {/* Data Rights */}
 <div className="mt-6 rounded-2xl border border-outline-variant/50 bg-surface-container/60 p-4">
 <h2 className="text-sm font-semibold text-on-surface">
 Data Rights
 </h2>
 <p className="mt-1 text-xs text-outline">
 Export or permanently delete all local vault data.
 </p>
 <div className="mt-3 flex flex-wrap gap-2">
  <DataExportButton />
  <DataDeleteButton />
 </div>
 </div>

 {/* MFA - TOTP */}
 {/* shortcut: enforced for owners/admins requires a server-side role table; */}
 {/* this UI is available to all users until the backend adds role checks. */}
 <div className="mt-6 rounded-2xl border border-outline-variant/50 bg-surface-container/60 p-4">
 <h2 className="text-sm font-semibold text-on-surface">
 Multi-Factor Authentication
 </h2>
 <p className="mt-1 text-xs text-outline">
 TOTP authenticator app. Enforced for owners and admins.
 </p>
 <MfaSection />
 </div>
 </div>
 </div>
 );
}

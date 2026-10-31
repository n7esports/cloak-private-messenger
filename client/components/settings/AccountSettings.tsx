"use client";

import { useState } from "react";
import IconKey from "../icons/IconKey";
import IconRefresh from "../icons/IconRefresh";
import IconUser from "../icons/IconUser";
import IconShield from "../icons/IconShield";
import IconDownload from "../icons/IconDownload";
import IconTrash from "../icons/IconTrash";
import {
  deleteLocalVaultData,
  downloadEncryptedVaultExport,
} from "@/lib/dataPortability";
import { useVaultStore } from "@/store/useVaultStore";

const ACCOUNT_ACTIONS = [
  {
    id: "change-pin",
    label: "Change PIN",
    description: "Update your local vault unlock PIN.",
    icon: IconKey,
    variant: "default" as const,
    disabled: true,
  },
  {
    id: "renew-key",
    label: "Renew Key",
    description: "Rotate your identity signing key pair.",
    icon: IconRefresh,
    variant: "default" as const,
    disabled: true,
  },
  {
    id: "passkeys",
    label: "Passkeys",
    description: "Manage hardware-bound passkeys for vault unlock.",
    icon: IconShield,
    variant: "default" as const,
    disabled: true,
  },
  {
    id: "passwords",
    label: "Passwords",
    description: "Manage saved credentials and autofill settings.",
    icon: IconUser,
    variant: "default" as const,
    disabled: true,
  },
] as const;

export default function AccountSettings({
  showToast,
}: {
  showToast: (toast: { id: string; message: string; type?: "success" | "info" | "warning" }) => void;
}) {
  const [busy, setBusy] = useState(false);
  const lockVault = useVaultStore((state) => state.lockVault);

  const handleAction = (id: string) => {
    showToast({
      id: crypto.randomUUID(),
      message: `${id.replace(/-/g, " ").replace(/\\b\\w/g, (c) => c.toUpperCase())} ships later`,
      type: "info",
    });
  };

  const handleExport = async () => {
    setBusy(true);
    try {
      await downloadEncryptedVaultExport();
      showToast({
        id: crypto.randomUUID(),
        message: "Encrypted vault export downloaded.",
        type: "success",
      });
    } catch (error) {
      showToast({
        id: crypto.randomUUID(),
        message: error instanceof Error ? error.message : "Could not export local data.",
        type: "warning",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Permanently erase this device's local vault, identity keys, messages, and encrypted records? This cannot be undone.",
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      await deleteLocalVaultData();
      localStorage.removeItem("cloak.identity.alias");
      lockVault();
      showToast({
        id: crypto.randomUUID(),
        message: "Local vault data erased from this device.",
        type: "success",
      });
      window.location.assign("/lock");
    } catch (error) {
      showToast({
        id: crypto.randomUUID(),
        message: error instanceof Error ? error.message : "Could not completely erase local data.",
        type: "warning",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-outline-variant/50 bg-surface-container/60 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-on-surface">Export encrypted data</p>
            <p className="mt-0.5 text-xs text-outline">
              Download encrypted chats, messages, sessions, notes, and queued records from this device.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={busy}
            className="shrink-0 rounded-xl border border-outline-variant bg-surface-container/60 px-3 py-1.5 text-xs font-medium text-on-surface-variant transition hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="inline-flex items-center gap-2">
              <IconDownload size={14} />
              Export
            </span>
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-status-danger/40 bg-surface-container/60 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-status-danger">Delete local vault</p>
            <p className="mt-0.5 text-xs text-outline">
              Permanently erase this device's identity keys and local encrypted data. This does not delete remote relay copies.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="shrink-0 rounded-xl border border-status-danger/40 bg-status-danger/10 px-3 py-1.5 text-xs font-medium text-status-danger transition hover:bg-status-danger/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="inline-flex items-center gap-2">
              <IconTrash size={14} />
              Delete
            </span>
          </button>
        </div>
      </div>

      {ACCOUNT_ACTIONS.map(({ id, label, description, icon: Icon, variant, disabled }) => (
        <div
          key={id}
          className="rounded-2xl border border-outline-variant/50 bg-surface-container/60 p-4"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent-emerald">
                <Icon size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-on-surface">{label}</p>
                <p className="mt-0.5 text-xs text-outline">{description}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleAction(id)}
              disabled={disabled || busy}
              title={disabled ? "Ships later" : undefined}
              className={`shrink-0 rounded-xl border border-outline-variant bg-surface-container/60 px-3 py-1.5 text-xs font-medium text-on-surface-variant transition hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-40 ${variant === "danger" ? "border-status-danger/40 text-status-danger" : ""}`}
            >
              {label}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

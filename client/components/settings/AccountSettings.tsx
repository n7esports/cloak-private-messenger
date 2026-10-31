"use client";

import IconTrash from "../icons/IconTrash";
import IconKey from "../icons/IconKey";
import IconRefresh from "../icons/IconRefresh";
import IconUser from "../icons/IconUser";
import IconShield from "../icons/IconShield";

const ACCOUNT_ACTIONS = [
  {
    id: "delete-account",
    label: "Delete Account",
    description: "Permanently erase your identity, keys, and all stored data.",
    icon: IconTrash,
    variant: "danger" as const,
    disabled: true,
  },
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
  const handleAction = (id: string) => {
    showToast({ id: crypto.randomUUID(), message: `${id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} ships later`, type: "info" });
  };

  return (
    <div className="flex flex-col gap-4">
      {ACCOUNT_ACTIONS.map(({ id, label, description, icon: Icon, variant, disabled }) => (
        <div
          key={id}
          className="rounded-2xl border border-outline-variant/50 bg-surface-container/60 p-4"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  variant === "danger"
                    ? "bg-status-danger/10 text-status-danger"
                    : "bg-accent-subtle text-accent-emerald"
                }`}
              >
                <Icon size={16} />
              </div>
              <div>
                <p
                  className={`text-sm font-medium ${
                    variant === "danger" ? "text-status-danger" : "text-on-surface"
                  }`}
                >
                  {label}
                </p>
                <p className="mt-0.5 text-xs text-outline">{description}</p>
              </div>
            </div>
            <button
              onClick={() => handleAction(id)}
              disabled={disabled}
              title={disabled ? "Ships later" : undefined}
              className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                variant === "danger"
                  ? "border-status-danger/40 bg-status-danger/10 text-status-danger hover:bg-status-danger/20"
                  : "border-outline-variant bg-surface-container/60 text-on-surface-variant hover:border-outline-variant hover:text-on-surface"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {label}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

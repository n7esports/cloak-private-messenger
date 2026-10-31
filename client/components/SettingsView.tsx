"use client";

import { useState, useCallback } from "react";
import { useChatStore } from "../store/useChatStore";
import AppearanceSettings from "@/components/settings/Appearance";
import NotificationSettings from "@/components/settings/Notifications";
import PrivacySettings from "@/components/settings/Privacy";
import LinkedDevices from "./settings/LinkedDevices";
import AccountSettings from "./settings/AccountSettings";

const TTL_OPTIONS = [
 { label: "Off", value: null },
 { label: "1 hour", value: 1000 * 60 * 60 },
 { label: "6 hours", value: 1000 * 60 * 60 * 6 },
 { label: "24 hours", value: 1000 * 60 * 60 * 24 },
 { label: "7 days", value: 1000 * 60 * 60 * 24 * 7 },
];

export type SettingsSection = "linked-devices" | "account" | "appearance" | "notifications" | "privacy";

export function SettingsView({ section }: { section: SettingsSection }) {
 const devices = useChatStore((s) => s.devices);
 const ephemeralTtl = useChatStore((s) => s.ephemeralTtl);
 const setEphemeralTtl = useChatStore((s) => s.setEphemeralTtl);
 const removeDevice = useChatStore((s) => s.removeDevice);
 const showToast = useChatStore((s) => s.showToast);

 const renderAppearance = () => (
  <div className="rounded-2xl border border-outline-variant/50 bg-surface-container/60 p-4">
   <h2 className="text-sm font-semibold text-on-surface">Ephemeral Messages</h2>
   <p className="mt-1 text-xs text-outline">Auto-delete messages after the selected window.</p>
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
 );

 return (
  <div className="flex h-full w-full overflow-y-auto bg-surface p-6">
   <div className="mx-auto w-full max-w-2xl">
    {section === "linked-devices" && (
     <>
      <h1 className="font-sans text-xl font-semibold text-on-surface">Linked Devices</h1>
      <p className="mt-1 text-xs text-outline">Manage active sessions across your devices.</p>
      <div className="mt-6 flex flex-col gap-6">
       <LinkedDevices devices={devices} removeDevice={removeDevice} showToast={showToast} />
      </div>
     </>
    )}
    {section === "account" && (
     <>
      <h1 className="font-sans text-xl font-semibold text-on-surface">Account</h1>
      <p className="mt-1 text-xs text-outline">Security, data, and identity controls.</p>
      <div className="mt-6 flex flex-col gap-6">
       <AccountSettings showToast={showToast} />
      </div>
     </>
    )}
    {section === "appearance" && (
     <>
      <h1 className="font-sans text-xl font-semibold text-on-surface">Appearance</h1>
      <p className="mt-1 text-xs text-outline">Display and message behavior.</p>
      <div className="mt-6 flex flex-col gap-6">
       <AppearanceSettings />
      </div>
     </>
    )}
    {section === "notifications" && (
     <>
      <h1 className="font-sans text-xl font-semibold text-on-surface">Notifications</h1>
      <p className="mt-1 text-xs text-outline">Notification preferences.</p>
      <div className="mt-6 flex flex-col gap-6">
       <NotificationSettings />
      </div>
     </>
    )}
    {section === "privacy" && (
     <>
      <h1 className="font-sans text-xl font-semibold text-on-surface">Privacy</h1>
      <p className="mt-1 text-xs text-outline">Privacy and security settings.</p>
      <div className="mt-6 flex flex-col gap-6">
       <PrivacySettings />
      </div>
     </>
    )}
   </div>
  </div>
 );
}

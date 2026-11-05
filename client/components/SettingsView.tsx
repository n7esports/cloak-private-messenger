"use client";

import { useChatStore } from "../store/useChatStore";
import AppearanceSettings from "@/components/settings/Appearance";
import NotificationSettings from "@/components/settings/Notifications";
import PrivacySettings from "@/components/settings/Privacy";
import LinkedDevices from "./settings/LinkedDevices";
import AccountSettings from "./settings/AccountSettings";

export type SettingsSection = "linked-devices" | "account" | "appearance" | "notifications" | "privacy";

export function SettingsView({ section }: { section: SettingsSection }) {
 const devices = useChatStore((s) => s.devices);
 const removeDevice = useChatStore((s) => s.removeDevice);
 const showToast = useChatStore((s) => s.showToast);

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

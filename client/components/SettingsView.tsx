"use client";

import { useState, useCallback } from "react";
import { useChatStore } from "../store/useChatStore";
import NotificationSettings from "@/components/settings/Notifications";
import PrivacySettings from "@/components/settings/Privacy";
import AccountSettings from "./settings/AccountSettings";
import ChatsSettings from "./settings/ChatsSettings";
import StorageSettings from "./settings/StorageSettings";
import BlockedUsers from "./settings/BlockedUsers";
import HelpSettings from "./settings/HelpSettings";
import LinkedDevices from "./settings/LinkedDevices";

export type SettingsSection = "account" | "privacy" | "chats" | "notifications" | "storage" | "blocked" | "linked-devices" | "help";

export function SettingsView({ section }: { section: SettingsSection }) {
  const showToast = useChatStore((s) => s.showToast);

  return (
    <div className="flex h-full w-full overflow-y-auto bg-surface p-6">
      <div className="mx-auto w-full max-w-2xl">
        {section === "account" && (
          <>
            <h1 className="font-sans text-xl font-semibold text-on-surface">Account</h1>
            <p className="mt-1 text-xs text-outline">Security, data, and identity controls.</p>
            <div className="mt-6 flex flex-col gap-6">
              <AccountSettings showToast={showToast} />
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
        {section === "chats" && (
          <>
            <h1 className="font-sans text-xl font-semibold text-on-surface">Chats</h1>
            <p className="mt-1 text-xs text-outline">Manage your conversations.</p>
            <div className="mt-6 flex flex-col gap-6">
              <ChatsSettings />
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
        {section === "storage" && (
          <>
            <h1 className="font-sans text-xl font-semibold text-on-surface">Storage / Data</h1>
            <p className="mt-1 text-xs text-outline">Manage local storage and data.</p>
            <div className="mt-6 flex flex-col gap-6">
              <StorageSettings />
            </div>
          </>
        )}
        {section === "blocked" && (
          <>
            <h1 className="font-sans text-xl font-semibold text-on-surface">Blocked Users</h1>
            <p className="mt-1 text-xs text-outline">Contacts you have blocked.</p>
            <div className="mt-6 flex flex-col gap-6">
              <BlockedUsers />
            </div>
          </>
        )}
        {section === "linked-devices" && (
          <>
            <h1 className="font-sans text-xl font-semibold text-on-surface">Linked Devices</h1>
            <p className="mt-1 text-xs text-outline">Manage devices with access to your account.</p>
            <div className="mt-6 flex flex-col gap-6">
              <LinkedDevices />
            </div>
          </>
        )}
        {section === "help" && (
          <>
            <h1 className="font-sans text-xl font-semibold text-on-surface">Help</h1>
            <p className="mt-1 text-xs text-outline">Get support and learn more about UQZERA.</p>
            <div className="mt-6 flex flex-col gap-6">
              <HelpSettings />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

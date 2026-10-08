import type { ComponentType } from "react";
import {
  IconAutoLock,
  IconBackup,
  IconBroadcast,
  IconCheck,
  IconLock,
  IconNote,
  IconOffline,
  IconSend,
  IconShield,
  IconTimer,
  IconTor,
} from "../components/icons/GuideIcons";

export type GuideItem = {
  icon?: ComponentType<{ className?: string }>;
  title?: string;
  body: string;
  action?: { label: string; href: string; comingSoon?: boolean };
};

export const guideContent: GuideItem[] = [
  {
    body: "Hi. I'll show you what Cloak can do. Each card has one feature and a button to try it. Come back here anytime.",
  },
  {
    icon: IconLock,
    title: "Private Chats",
    body: "Messages are encrypted on your device. Only you and your contact can read them.",
    action: {
      label: "Start a chat",
      href: "/chats/new",
      comingSoon: true,
    },
  },
  {
    icon: IconNote,
    title: "Private Notes",
    body: "A personal space for drafts and links. Stays on your device.",
    action: { label: "Open Notes", href: "/chats/notes", comingSoon: true },
  },
  {
    icon: IconBroadcast,
    title: "Channels",
    body: "Broadcast to many people. Public or invite-only.",
    action: {
      label: "Create a channel",
      href: "/channels/create",
      comingSoon: true,
    },
  },
  {
    icon: IconTimer,
    title: "Self-Destruct",
    body: "Set a timer. Messages delete from both sides.",
    action: {
      label: "Set a timer",
      href: "/settings/timer",
      comingSoon: true,
    },
  },
  {
    icon: IconCheck,
    title: "Verify Contacts",
    body: "Compare safety numbers to be sure no one is impersonating your contact.",
    action: {
      label: "Show my number",
      href: "/settings/safety",
      comingSoon: true,
    },
  },
  {
    icon: IconShield,
    title: "Panic Wipe",
    body: "A second passphrase that wipes the vault instantly if you're forced to unlock.",
    action: {
      label: "Set up wipe",
      href: "/settings/duress",
      comingSoon: true,
    },
  },
  {
    icon: IconBackup,
    title: "Backup",
    body: "Export an encrypted copy. Only your passphrase can open it.",
    action: {
      label: "Create backup",
      href: "/settings/backup",
      comingSoon: true,
    },
  },
  {
    icon: IconAutoLock,
    title: "Auto-Lock",
    body: "Cloak locks itself when idle or when you switch tabs.",
    action: {
      label: "Adjust timing",
      href: "/settings/autolock",
      comingSoon: true,
    },
  },
  {
    icon: IconOffline,
    title: "Works Offline",
    body: "Messages queue locally and send when you're back online.",
    action: {
      label: "Learn more",
      href: "/settings/offline",
      comingSoon: true,
    },
  },
  {
    icon: IconTor,
    title: "Tor Mode",
    body: "Route traffic through Tor to hide your IP. Off by default.",
    action: {
      label: "Enable Tor",
      href: "/settings/tor",
      comingSoon: true,
    },
  },
  {
    icon: IconSend,
    title: "You're Ready",
    body: "That's everything. I'll be here if you need me.",
    action: {
      label: "Send a message",
      href: "/chats/new",
      comingSoon: true,
    },
  },
];

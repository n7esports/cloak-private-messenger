import type { ComponentType } from "react";
import {
  IconBackup,
  IconBroadcast,
  IconChat,
  IconCheck,
  IconDevice,
  IconKey,
  IconLock,
  IconNote,
  IconOffline,
  IconQR,
  IconSend,
  IconTimer,
  IconTor,
  IconTrash,
} from "../components/icons/GuideIcons";

/**
 * A guide action either navigates to a real route (`href`) or asks the guide
 * page to run an in-app intent (`intent`). `comingSoon` marks features that
 * are not wired up yet so the UI can disable the button instead of sending
 * the user to a 404.
 */
export type GuideAction = {
  label: string;
  href?: string;
  intent?: "new-chat" | "key-exchange" | "panic-wipe";
  comingSoon?: boolean;
};

export type GuideSection = {
  heading: string;
  caption: string;
  items: {
    icon: ComponentType<{ className?: string }>;
    title: string;
    body: string;
    action?: GuideAction;
  }[];
};

export const guideIntro =
  "Hi, I'm your Cloak guide. There is no sign-up, no passphrase and no account — the app opens straight into your encrypted chats. Everything below is grouped so you can find a feature fast.";

export const guideSections: GuideSection[] = [
  {
    heading: "Getting started",
    caption: "The three things you'll do most",
    items: [
      {
        icon: IconChat,
        title: "Start a private chat",
        body: "Open a new conversation and add someone by their public key or QR code. Messages are encrypted on this device before they ever leave it.",
        action: { label: "Start a chat", intent: "new-chat" },
      },
      {
        icon: IconQR,
        title: "Exchange keys & add contacts",
        body: "Show your own QR / public key, or scan a contact's code to add them. Cloak has no username directory — the key is the identity.",
        action: { label: "Open key exchange", intent: "key-exchange" },
      },
      {
        icon: IconNote,
        title: "Private Notes",
        body: "A personal, encrypted space for drafts and links. Stored only on this device and never sent through the relay.",
        action: { label: "Open Notes", href: "/chats/notes" },
      },
    ],
  },
  {
    heading: "Your vault",
    caption: "No passphrase, encrypted on this device",
    items: [
      {
        icon: IconLock,
        title: "Opens without a passphrase",
        body: "There is no login screen. Cloak creates a random device key the first time you open it and unlocks your vault silently, so your chats stay encrypted at rest.",
        action: { label: "Lock now", href: "/lock" },
      },
      {
        icon: IconKey,
        title: "Your keys never leave",
        body: "Your identity is generated here and never uploaded. The device key in this browser encrypts your identity, chats, notes and attachments.",
      },
      {
        icon: IconDevice,
        title: "One device, one vault",
        body: "Conversations live on this device only. Opening Cloak elsewhere starts a fresh vault — there is no account to sign in to.",
      },
    ],
  },
  {
    heading: "Privacy controls",
    caption: "Lock down and wipe on your terms",
    items: [
      {
        icon: IconTimer,
        title: "Self-destructing messages",
        body: "Attach a timer when you send (5s to 7 days). The message deletes itself from both sides once the countdown ends.",
        action: { label: "Compose with a timer", href: "/chats?compose=1&timer=60000" },
      },
      {
        icon: IconTrash,
        title: "Panic Wipe",
        body: "Instantly erase this device's entire vault — identity, chats and notes. Use it if you're ever forced to hand over your device.",
        action: { label: "Go to wipe control", intent: "panic-wipe" },
      },
      {
        icon: IconCheck,
        title: "Verify before you trust",
        body: "Compare public keys out-of-band before your first message to be sure no one is impersonating your contact.",
      },
    ],
  },
  {
    heading: "Using the app",
    caption: "Day-to-day actions",
    items: [
      {
        icon: IconSend,
        title: "Attachments & reactions",
        body: "Tap the paperclip to send photos, files, audio or a location. Long-press a message (or use the arrow) to reply, react, star, pin, forward or delete it.",
      },
      {
        icon: IconOffline,
        title: "Works offline",
        body: "No relay? No problem. Messages queue locally and send the moment you're back online. Nothing is lost.",
      },
    ],
  },
  {
    heading: "On the roadmap",
    caption: "Built but not switched on yet",
    items: [
      {
        icon: IconBroadcast,
        title: "Channels",
        body: "Broadcast to many people at once, public or invite-only, still end-to-end encrypted.",
        action: { label: "Coming soon", href: "/chats/channels", comingSoon: true },
      },
      {
        icon: IconBackup,
        title: "Encrypted backup",
        body: "Export an encrypted copy of your vault. Only your device key can open it.",
        action: { label: "Coming soon", comingSoon: true },
      },
      {
        icon: IconTor,
        title: "Tor mode",
        body: "Route traffic through Tor to hide your IP address. Off by default.",
        action: { label: "Coming soon", comingSoon: true },
      },
    ],
  },
];

export const guideOutro = {
  icon: IconSend,
  title: "You're all set",
  body: "That's the tour. I'll be pinned in your sidebar whenever you need a refresher.",
  action: { label: "Send a message", intent: "new-chat" } as GuideAction,
};

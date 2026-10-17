"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  startChatServices,
  useChatStore,
} from "../../store/useChatStore";
import { useVaultStore } from "../../store/useVaultStore";
import { SESSION_IDLE_TIMEOUT_MS } from "../../src/lib/security";
import { Sidebar } from "../../components/Sidebar";
import { Header } from "../../components/Header";
import { Toast, type ToastItem } from "../../components/Toast";

export default function ChatsLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const isUnlocked = useVaultStore((state) => state.isUnlocked);
  const sessionRestored = useVaultStore((state) => state.sessionRestored);
  const initializeVault = useVaultStore((state) => state.initializeVault);
  const lockVault = useVaultStore((state) => state.lockVault);
  const chats = useChatStore((state) => state.chats);
  const loadChats = useChatStore((state) => state.loadChats);
  const isChatLoading = useChatStore((state) => state.isLoading);
  const chatError = useChatStore((state) => state.error);
  const [error, setError] = useState("");

  // ── Modal state ──────────────────────────────────────────────────────────
  const [vaultModalOpen, setVaultModalOpen] = useState(false);
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [callModalState, setCallModalState] = useState<"audio" | "video" | null>(null);

  // ── Mobile sidebar drawer ────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Toast state ──────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const pushToast = (message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, message }]);
  };
  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // ── Idle auto-lock ───────────────────────────────────────────────────────
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>();
  useEffect(() => {
    if (!isUnlocked) return undefined;
    const scheduleLock = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        if (typeof window !== "undefined" && window.location.pathname === "/lock") {
          return;
        }
        lockVault();
        router.replace("/lock");
      }, SESSION_IDLE_TIMEOUT_MS);
    };
    const activityEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "wheel",
      "touchstart",
      "focus",
    ];
    for (const event of activityEvents) {
      window.addEventListener(event, scheduleLock);
    }
    scheduleLock();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = undefined;
      for (const event of activityEvents) {
        window.removeEventListener(event, scheduleLock);
      }
    };
  }, [isUnlocked, lockVault, router]);

  // ── Vault init + chat service start ──────────────────────────────────────
  useEffect(() => {
    if (!sessionRestored) {
      void initializeVault().catch((cause: unknown) => {
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not open the device vault.",
        );
      });
      return undefined;
    }
    if (!isUnlocked) {
      router.replace("/lock");
      return undefined;
    }

    let active = true;
    let stopTransport: (() => void) | undefined;
    loadChats()
      .then(() => {
        if (active) stopTransport = startChatServices();
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load encrypted conversations.",
          );
        }
      });
    return () => {
      active = false;
      stopTransport?.();
    };
  }, [initializeVault, isUnlocked, loadChats, router, sessionRestored]);

  // ── Route helpers ────────────────────────────────────────────────────────
  const isMessagesRoute = pathname === "/chats";
  const isChannelsRoute = pathname === "/chats/channels";
  const isChatDetailRoute = pathname.startsWith("/chats/chat/");
  const isSettingsRoute = pathname === "/settings";

  // Close mobile drawer on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // ── Loading / error gates ────────────────────────────────────────────────
  if (!sessionRestored || !isUnlocked) return null;
  if (error || chatError) {
    return (
      <main className="cloak-app-screen grid place-items-center bg-cloak-base px-6 text-cloak-text">
        <p role="alert" className="max-w-lg text-center text-sm text-cloak-danger">
          {error || chatError}
        </p>
      </main>
    );
  }
  if (isChatLoading && chats.length === 0) {
    return (
      <main className="cloak-app-screen grid place-items-center bg-cloak-base px-6 text-cloak-text">
        <p role="status" className="text-sm text-cloak-muted">
          Loading encrypted conversations…
        </p>
      </main>
    );
  }

  // ── Settings route: render without chat shell ────────────────────────────
  if (isSettingsRoute) {
    return (
      <div className="cloak-ambient cloak-app-screen flex font-sans text-cloak-text">
        <Sidebar />
        <div className="min-w-0 flex-1 flex flex-col h-full">
          <Header />
          <main className="flex-1 overflow-y-auto pt-16">{children}</main>
        </div>
        <Toast toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  // ── Main chat shell ──────────────────────────────────────────────────────
  return (
    <div className="cloak-ambient cloak-app-screen flex font-sans text-cloak-text">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile sidebar drawer + backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="min-w-0 flex-1 flex flex-col h-full">
        <Header />
        <main className="flex-1 overflow-y-auto pt-16">{children}</main>
      </div>

      {/* Global toast notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import PasscodeModal from "../components/PasscodeModal";
import {
  hasPasscodes,
  setPasscodes,
  triggerDecoyWipe,
  triggerPanicWipe,
  verifyPasscode,
} from "../lib/security";
import "../styles/globals.css";

const IDLE_LOCK_TIMEOUT_MS = 5 * 60 * 1000;

export default function App({ Component, pageProps }) {
  const [ready, setReady] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [hasMountedApp, setHasMountedApp] = useState(false);
  const [decoy, setDecoy] = useState(false);
  const [startupError, setStartupError] = useState("");
  const unlockedRef = useRef(false);

  const lockApp = useCallback(async () => {
    if (!unlockedRef.current) return;
    unlockedRef.current = false;
    setUnlocked(false);
  }, []);

  const panicWipe = useCallback(async () => {
    unlockedRef.current = false;
    setUnlocked(false);
    setHasMountedApp(false);
    setDecoy(false);
    try {
      await triggerPanicWipe();
      setConfigured(false);
      setStartupError("");
    } catch (error) {
      console.error("Panic wipe failed:", error);
      setStartupError("The panic wipe could not clear all data. Restart the app.");
    }
  }, []);

  useEffect(() => {
    let active = true;
    hasPasscodes()
      .then((exists) => {
        if (!active) return;
        setConfigured(exists);
        setReady(true);
      })
      .catch((error) => {
        console.error("Could not read passcode configuration:", error);
        if (!active) return;
        setStartupError("Could not access secure passcode storage.");
        setReady(true);
      });

    if (typeof window !== "undefined") {
      window.triggerPanicWipe = panicWipe;
    }
    return () => {
      active = false;
      if (typeof window !== "undefined" && window.triggerPanicWipe === panicWipe) {
        delete window.triggerPanicWipe;
      }
    };
  }, [panicWipe]);

  useEffect(() => {
    if (!unlocked) return undefined;

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        lockApp();
      }
    };
    let idleTimeout;
    const resetIdleTimeout = () => {
      window.clearTimeout(idleTimeout);
      idleTimeout = window.setTimeout(lockApp, IDLE_LOCK_TIMEOUT_MS);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    for (const eventName of ["pointerdown", "keydown", "touchstart"]) {
      window.addEventListener(eventName, resetIdleTimeout, { passive: true });
    }
    resetIdleTimeout();

    let appStateListener;
    let listenerCancelled = false;
    if (Capacitor.isNativePlatform()) {
      import("@capacitor/app")
        .then(({ App }) =>
          App.addListener("appStateChange", ({ isActive }) => {
            if (!isActive) lockApp();
          })
        )
        .then((listener) => {
          if (listenerCancelled) {
            listener.remove().catch((error) => {
              console.error("Could not remove native app state listener:", error);
            });
          } else {
            appStateListener = listener;
          }
        })
        .catch((error) => {
          console.error("Could not observe native app state:", error);
        });
    }

    return () => {
      listenerCancelled = true;
      window.clearTimeout(idleTimeout);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      for (const eventName of ["pointerdown", "keydown", "touchstart"]) {
        window.removeEventListener(eventName, resetIdleTimeout);
      }
      appStateListener?.remove().catch((error) => {
        console.error("Could not remove native app state listener:", error);
      });
    };
  }, [lockApp, unlocked]);

  const handleSetup = async (primaryPasscode, decoyPasscode) => {
    await setPasscodes(primaryPasscode, decoyPasscode);
    setConfigured(true);
    unlockedRef.current = true;
    setUnlocked(true);
    setHasMountedApp(true);
    setStartupError("");
  };

  const handleVerify = async (passcode) => {
    const result = await verifyPasscode(passcode);
    if (result === "decoy") {
      await triggerDecoyWipe();
      unlockedRef.current = false;
      setUnlocked(false);
      setHasMountedApp(false);
      setDecoy(true);
      return result;
    }
    if (result === "primary") {
      unlockedRef.current = true;
      setUnlocked(true);
      setHasMountedApp(true);
      setStartupError("");
    }
    return result;
  };

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#09090b] text-sm text-zinc-400">
        Unlocking secure vault…
      </div>
    );
  }

  if (decoy) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#09090b] px-6 text-center text-zinc-100">
        <section>
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-500">
            <svg aria-hidden="true" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M4 7h16M6 7l1 14h10l1-14M9 7V4h6v3m-5 4v6m4-6v6" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold">Empty Vault</h1>
          <p className="mt-2 text-sm text-zinc-500">No secure rooms found.</p>
        </section>
      </main>
    );
  }

  if (!unlocked) {
    if (startupError && !configured) {
      return (
        <main className="grid min-h-screen place-items-center bg-[#09090b] px-6 text-center text-rose-300">
          <p role="alert">{startupError}</p>
        </main>
      );
    }
    return (
      <>
        {hasMountedApp && <Component {...pageProps} />}
        <PasscodeModal
          configured={configured}
          error={startupError}
          onSetup={handleSetup}
          onVerify={handleVerify}
        />
      </>
    );
  }

  return <Component {...pageProps} />;
}

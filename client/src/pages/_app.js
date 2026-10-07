import { useCallback, useEffect, useRef, useState } from "react";
import PasscodeModal from "../components/PasscodeModal";
import {
  clearSessionActive,
  getSessionIdleRemainingMs,
  hasPasscodes,
  isSessionActive,
  nukeSessionData as purgeSessionData,
  setSessionActive,
  setPasscodes,
  triggerDecoyWipe,
  touchSessionActivity,
  verifyPasscode,
} from "../lib/security";
import "../styles/globals.css";

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
    try {
      clearSessionActive();
    } catch (error) {
      console.error("Could not clear active session state:", error);
      setStartupError("Could not safely lock the current session.");
    }
  }, []);

  const nukeSessionData = useCallback(async () => {
    unlockedRef.current = false;
    setUnlocked(false);
    setHasMountedApp(false);
    setDecoy(false);
    try {
      await purgeSessionData();
      setConfigured(false);
      setStartupError("");
    } catch (error) {
      console.error("Emergency session purge failed:", error);
      setStartupError("The emergency purge could not clear all data. Restart the app.");
    }
  }, []);

  useEffect(() => {
    let active = true;
    hasPasscodes()
      .then((exists) => {
        if (!active) return;
        setConfigured(exists);
        if (exists && isSessionActive()) {
          unlockedRef.current = true;
          setUnlocked(true);
          setHasMountedApp(true);
        }
        setReady(true);
      })
      .catch((error) => {
        console.error("Could not read passcode configuration:", error);
        if (!active) return;
        setStartupError("Could not access secure passcode storage.");
        setReady(true);
      });

    if (typeof window !== "undefined") {
      window.nukeSessionData = nukeSessionData;
    }
    return () => {
      active = false;
      if (
        typeof window !== "undefined" &&
        window.nukeSessionData === nukeSessionData
      ) {
        delete window.nukeSessionData;
      }
    };
  }, [nukeSessionData]);

  useEffect(() => {
    if (!unlocked) return undefined;

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && !isSessionActive()) {
        lockApp();
        return;
      }
      resetIdleTimeout();
    };
    let idleTimeout;
    const resetIdleTimeout = () => {
      window.clearTimeout(idleTimeout);
      let remaining;
      try {
        remaining = getSessionIdleRemainingMs();
      } catch (error) {
        console.error("Could not check the session idle timeout:", error);
        lockApp();
        return;
      }
      idleTimeout = window.setTimeout(lockApp, remaining);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    resetIdleTimeout();
    const activityHandlers = [];
    for (const eventName of ["pointerdown", "keydown", "touchstart"]) {
      const handler = () => {
        try {
          touchSessionActivity();
          resetIdleTimeout();
        } catch (error) {
          console.error("Could not update session activity:", error);
          lockApp();
        }
      };
      activityHandlers.push([eventName, handler]);
      window.addEventListener(eventName, handler, { passive: true });
    }

    return () => {
      window.clearTimeout(idleTimeout);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      activityHandlers.forEach(([eventName, handler]) => {
        window.removeEventListener(eventName, handler);
      });
    };
  }, [lockApp, unlocked]);

  const handleSetup = async (primaryPasscode, decoyPasscode) => {
    await setPasscodes(primaryPasscode, decoyPasscode);
    setConfigured(true);
    setSessionActive();
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
      setSessionActive();
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
        {hasMountedApp && (
          <div
            aria-hidden={!unlocked}
            className={unlocked ? "" : "invisible pointer-events-none"}
            inert={unlocked ? undefined : ""}
          >
            <Component {...pageProps} />
          </div>
        )}
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

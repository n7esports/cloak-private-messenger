"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useVaultStore } from "../../store/useVaultStore";
import { useChatStore } from "../../store/useChatStore";

export default function LockPage() {
 const router = useRouter();
 const isUnlocked = useVaultStore((state) => state.isUnlocked);
 const sessionRestored = useVaultStore((state) => state.sessionRestored);
 const sessionRestoreError = useVaultStore((state) => state.sessionRestoreError);
 const unlockVault = useVaultStore((state) => state.unlockVault);

 useEffect(() => {
 if (sessionRestored && isUnlocked) {
 router.replace("/chats");
 }
 }, [sessionRestored, isUnlocked, router]);

 if (!sessionRestored) {
 return (
 <div className="flex h-screen w-full items-center justify-center bg-base">
 <div className="bg-panel border border-default flex flex-col items-center gap-3 px-8 py-6">
 <div className="h-2 w-2 rounded-full bg-primary " />
 <p className="font-mono text-xs uppercase tracking-widest text-secondary">
   Restoring session
 </p>
 </div>
 </div>
 );
 }

 if (!isUnlocked) {
 return (
 <div className="flex h-screen w-full items-center justify-center bg-base">
 <div className="bg-panel border border-default w-full max-w-sm px-8 py-10">
 <h1 className="font-sans text-2xl font-semibold tracking-tight text-primary">
 UQZERA
 </h1>
 <p className="mt-2 text-sm text-secondary">Enter your passcode to unlock.</p>
 {sessionRestoreError && (
 <p className="mt-2 text-sm text-error">{sessionRestoreError}</p>
 )}
 <button
 onClick={() => unlockVault()}
 className="mt-6 w-full rounded-xl accent-emerald py-3 text-sm font-medium transition hover:opacity-90"
 >
 Unlock
 </button>
 </div>
 </div>
 );
 }

 return null;
}

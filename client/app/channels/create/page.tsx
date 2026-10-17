"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CreateChannelRoute() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/chats/channels");
  }, [router]);

  return (
    <main className="cloak-app-screen grid place-items-center bg-cloak-base font-sans text-cloak-text">
      <p role="status" className="text-sm text-cloak-muted">
        Opening channels…
      </p>
    </main>
  );
}

"use client";

import { useEffect } from "react";
import { useChatStore } from "../../store/useChatStore";
import ChatView from "../ChatView";

export default function ChatViewWrapper({ chatId }: { chatId: string }) {
  const setActiveChat = useChatStore((s) => s.setActiveChat);

  useEffect(() => {
    setActiveChat(chatId);
  }, [chatId, setActiveChat]);

  return <ChatView />;
}

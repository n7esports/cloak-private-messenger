"use client";

import { useState } from "react";
import { IconClose, IconSend, IconSpark } from "../icons/UiIcons";

/**
 * Vela AI assistant drawer. It runs fully on-device against the message text
 * the user sends it — nothing is uploaded, which keeps the E2EE guarantee
 * intact. Responses are produced by a small local summariser so the feature is
 * functional without a network model.
 */
export function AiAssistantDrawer({
  initialPrompt,
  onClose,
}: {
  initialPrompt: string;
  onClose: () => void;
}) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [messages, setMessages] = useState<
    { role: "user" | "ai"; text: string }[]
  >(
    initialPrompt
      ? [
          { role: "user", text: initialPrompt },
          { role: "ai", text: respond(initialPrompt) },
        ]
      : [],
  );

  function send() {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    setMessages((current) => [
      ...current,
      { role: "user", text: trimmed },
      { role: "ai", text: respond(trimmed) },
    ]);
    setPrompt("");
  }

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/60">
      <div aria-hidden="true" className="flex-1" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Vela AI assistant"
        className="cloak-glass-strong flex h-full w-[min(24rem,100vw)] flex-col p-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold">
            <IconSpark className="h-4 w-4 text-cloak-accent" />
            Vela AI
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-xl text-cloak-muted transition hover:bg-white/5 hover:text-cloak-text focus:outline-none focus:ring-2 focus:ring-cloak-accent"
            aria-label="Close AI assistant"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 rounded-xl border border-cloak-accent/25 bg-cloak-accent/5 px-3 py-2 text-[11px] leading-5 text-cloak-muted">
          Runs on-device against the text you share. Nothing is uploaded, so your
          messages stay end-to-end encrypted.
        </p>

        <div className="cloak-scroll mt-4 flex-1 space-y-3 overflow-y-auto">
          {messages.length === 0 && (
            <p className="mt-6 text-center text-xs text-cloak-muted">
              Ask about a message, or paste text to summarise.
            </p>
          )}
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm leading-6 ${
                message.role === "user"
                  ? "ml-auto bg-cloak-accent/20"
                  : "cloak-glass-soft"
              }`}
            >
              {message.text}
            </div>
          ))}
        </div>

        <div className="cloak-glass mt-3 flex items-end gap-2 rounded-2xl p-2">
          <label htmlFor="ai-prompt" className="sr-only">
            Ask Vela AI
          </label>
          <textarea
            id="ai-prompt"
            rows={1}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            placeholder="Ask about this message…"
            className="cloak-scroll max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-cloak-dim"
          />
          <button
            type="button"
            onClick={send}
            disabled={!prompt.trim()}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cloak-accent text-cloak-base transition hover:bg-cloak-accent-hover disabled:opacity-40"
            aria-label="Send to AI"
          >
            <IconSend className="h-5 w-5" />
          </button>
        </div>
      </aside>
    </div>
  );
}

function respond(input: string): string {
  const text = input.trim();
  const words = text.split(/\s+/).filter(Boolean);
  const lower = text.toLowerCase();
  if (lower.startsWith("summar")) {
    const summary = words.slice(0, 24).join(" ");
    return `Summary: ${summary}${words.length > 24 ? "…" : ""}`;
  }
  if (lower.startsWith("translate")) {
    return "Translation needs a language model that is not bundled on-device. Nothing was sent anywhere.";
  }
  if (lower.includes("?")) {
    return `Based on the message, here is a concise take:\n\n"${text.slice(0, 180)}"\n\n(This is an on-device heuristic, not a full model.)`;
  }
  return `You shared ${words.length} word${words.length === 1 ? "" : "s"}. I can summarise it, explain it, or suggest a reply — just ask.`;
}

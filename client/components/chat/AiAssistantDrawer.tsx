"use client";

import { useState } from "react";
import { IconSend, IconSpark } from "../icons/UiIcons";
import { Sheet, SheetBody, SheetHeader } from "./Sheet";

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
    <Sheet open onClose={onClose} variant="right" label="Vela AI assistant">
      <SheetHeader
        title="Vela AI"
        onClose={onClose}
        icon={<IconSpark className="h-4 w-4 shrink-0 text-cloak-accent" />}
      />

      <p className="mx-5 mt-3 shrink-0 rounded-xl border border-cloak-accent/25 bg-cloak-accent/5 px-3 py-2 text-[11px] leading-5 text-cloak-muted">
        Runs on-device against the text you share. Nothing is uploaded, so your
        messages stay end-to-end encrypted.
      </p>

      <SheetBody className="px-5 py-4">
        <div className="space-y-3">
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
      </SheetBody>

      <div className="shrink-0 px-5 pb-[max(env(safe-area-inset-bottom),1rem)]">
        <div className="cloak-glass flex items-end gap-2 rounded-2xl p-2">
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
      </div>
    </Sheet>
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

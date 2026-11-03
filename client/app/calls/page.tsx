"use client";

import { useState } from "react";
import CallList from "../../components/CallList";
import InCallUI from "../../components/InCallUI";

export type CallType = "incoming" | "outgoing" | "missed";

export interface CallRecord {
  id: string;
  name: string;
  type: CallType;
  missed: boolean;
  timestamp: number;
  durationSeconds?: number;
}

const MOCK_CALLS: CallRecord[] = [
  { id: "1", name: "Alice", type: "incoming", missed: false, timestamp: Date.now() - 1000 * 60 * 5, durationSeconds: 120 },
  { id: "2", name: "Bob", type: "missed", missed: true, timestamp: Date.now() - 1000 * 60 * 60 },
  { id: "3", name: "Charlie", type: "outgoing", missed: false, timestamp: Date.now() - 1000 * 60 * 60 * 2, durationSeconds: 45 },
  { id: "4", name: "Dana", type: "incoming", missed: false, timestamp: Date.now() - 1000 * 60 * 60 * 24, durationSeconds: 300 },
  { id: "5", name: "Eli", type: "missed", missed: true, timestamp: Date.now() - 1000 * 60 * 60 * 48 },
];

export default function CallsPage() {
  const [activeCall, setActiveCall] = useState<CallRecord | null>(null);

  return (
    <div className="flex h-full w-full flex-col bg-surface">
      {activeCall ? (
        <InCallUI call={activeCall} onEnd={() => setActiveCall(null)} />
      ) : (
        <CallList calls={MOCK_CALLS} onCall={(call) => setActiveCall(call)} />
      )}
    </div>
  );
}

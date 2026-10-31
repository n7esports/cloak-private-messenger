"use client";

import { useState } from "react";
import { SettingsSidebar } from "@/components/settings/SettingsSidebar";
import { SettingsView, type SettingsSection } from "@/components/SettingsView";

const DEFAULT_SECTION: SettingsSection = "linked-devices";

export default function SettingsPage() {
  const [section, setSection] = useState<SettingsSection>(DEFAULT_SECTION);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-surface">
      <SettingsSidebar active={section} onSelect={setSection} />
      <main className="flex-1 overflow-hidden">
        <SettingsView section={section} />
      </main>
    </div>
  );
}

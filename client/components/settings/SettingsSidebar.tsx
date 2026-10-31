"use client";

import IconWifi from "../icons/IconWifi";
import IconUser from "../icons/IconUser";
import IconEye from "../icons/IconEye";
import IconBell from "../icons/IconBell";
import IconShield from "../icons/IconShield";

const SECTIONS = [
 { id: "linked-devices", label: "Linked Devices", Icon: IconWifi },
 { id: "account", label: "Account", Icon: IconUser },
 { id: "appearance", label: "Appearance", Icon: IconEye },
 { id: "notifications", label: "Notifications", Icon: IconBell },
 { id: "privacy", label: "Privacy", Icon: IconShield },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export function SettingsSidebar({
  active,
  onSelect,
}: {
  active: SectionId;
  onSelect: (id: SectionId) => void;
}) {
  return (
    <aside className="flex h-full w-60 flex-col border-r border-hairline bg-surface-container">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0F131C"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-on-surface">Settings</span>
      </div>

      <div className="mx-4 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }} />

      {/* Nav list */}
      <nav className="mt-2 flex flex-col gap-0.5 px-2">
        {SECTIONS.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                isActive
                  ? "bg-accent-subtle text-accent-emerald"
                  : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              }`}
            >
              <Icon size={18} />
              <span className="font-medium">{label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

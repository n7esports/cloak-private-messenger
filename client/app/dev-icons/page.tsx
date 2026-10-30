import IconAttach from "../../components/icons/IconAttach";
import IconBell from "../../components/icons/IconBell";
import IconChannel from "../../components/icons/IconChannel";
import IconChat from "../../components/icons/IconChat";
import IconCheck from "../../components/icons/IconCheck";
import IconCheckCircle from "../../components/icons/IconCheckCircle";
import IconCopy from "../../components/icons/IconCopy";
import IconHelpCircle from "../../components/icons/IconHelpCircle";
import IconImage from "../../components/icons/IconImage";
import IconKey from "../../components/icons/IconKey";
import IconLock from "../../components/icons/IconLock";
import IconMenu from "../../components/icons/IconMenu";
import IconMoreVertical from "../../components/icons/IconMoreVertical";
import IconSearch from "../../components/icons/IconSearch";
import IconSend from "../../components/icons/IconSend";
import IconSettings from "../../components/icons/IconSettings";
import IconShield from "../../components/icons/IconShield";
import IconUnlock from "../../components/icons/IconUnlock";
import IconUser from "../../components/icons/IconUser";
import IconUsers from "../../components/icons/IconUsers";
import IconWifi from "../../components/icons/IconWifi";
import IconX from "../../components/icons/IconX";

const ICONS = [
  IconAttach,
  IconBell,
  IconChannel,
  IconChat,
  IconCheck,
  IconCheckCircle,
  IconCopy,
  IconHelpCircle,
  IconImage,
  IconKey,
  IconLock,
  IconMenu,
  IconMoreVertical,
  IconSearch,
  IconSend,
  IconSettings,
  IconShield,
  IconUnlock,
  IconUser,
  IconUsers,
  IconWifi,
  IconX,
] as const;

export default function DevIconsPage() {
  return (
    <div className="min-h-screen bg-surface p-8">
      <h1 className="mb-6 font-sans text-xl font-semibold text-on-surface">
        Icon Set ({ICONS.length})
      </h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {ICONS.map((Icon, idx) => (
          <div
            key={idx}
            className="flex flex-col items-center gap-2 rounded-xl border border-outline-variant bg-surface-container p-4"
          >
            <Icon size={24} className="text-primary" />
            <span className="font-mono text-[10px] text-outline">
              {Icon.name.replace("Icon", "")}
            </span>
            <Icon size={16} className="text-on-surface-variant" />
            <Icon size={48} className="text-on-surface-variant" />
          </div>
        ))}
      </div>
    </div>
  );
}

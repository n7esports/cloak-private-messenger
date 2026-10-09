import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({
  children,
  width = 20,
  height = 20,
  viewBox = "0 0 24 24",
  fill = "none",
  stroke = "currentColor",
  strokeWidth = 1.6,
  strokeLinecap = "round",
  strokeLinejoin = "round",
  ...props
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox={viewBox}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconSend(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 12 20 4l-6.5 16-2.6-6.9z" />
      <path d="M10.9 13.1 20 4" />
    </Icon>
  );
}

export function IconPaperclip(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 11.5 12 19.5a5 5 0 0 1-7-7l8.2-8.2a3.3 3.3 0 0 1 4.7 4.7l-8.2 8.2a1.6 1.6 0 0 1-2.3-2.3l7.6-7.6" />
    </Icon>
  );
}

export function IconSmile(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" />
      <path d="M9 9.5h.01M15 9.5h.01" />
    </Icon>
  );
}

export function IconTimer(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.2 2.2M9.5 2.5h5" />
    </Icon>
  );
}

export function IconFlame(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3c1.8 2.6 5 4.2 5 8a5 5 0 0 1-10 0c0-1.6.7-2.7 1.6-3.6" />
      <path d="M12 21a5 5 0 0 0 5-5c0-2-1.3-3.2-2.4-4.3" />
    </Icon>
  );
}

export function IconLock(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
      <circle cx="12" cy="15.2" r="1" />
    </Icon>
  );
}

export function IconShield(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3l7.5 2.8v5.7c0 4.3-3 8-7.5 8.7-4.5-.7-7.5-4.4-7.5-8.7V5.8z" />
      <path d="M9 12.2l2 2 4-4.2" />
    </Icon>
  );
}

export function IconBell(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </Icon>
  );
}

export function IconBellOff(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 9a6 6 0 0 1 9.3-5" />
      <path d="M18 9.5c0 3.6 1.5 5 1.5 5H9" />
      <path d="M10 18a2 2 0 0 0 4 0" />
      <path d="M4 4l16 16" />
    </Icon>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-3.6-3.6" />
    </Icon>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function IconChevronLeft(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14.5 6 9 12l5.5 6" />
    </Icon>
  );
}

export function IconClose(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  );
}

export function IconKey(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="12" r="4" />
      <path d="M12 12h9M18 12v3M15.5 12v2.5" />
    </Icon>
  );
}

export function IconNote(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 4h10l4 4v12H5z" />
      <path d="M15 4v4h4M8 13h8M8 16h5" />
    </Icon>
  );
}

export function IconBroadcast(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="2" />
      <path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M6 6a8 8 0 0 0 0 12M18 6a8 8 0 0 1 0 12" />
    </Icon>
  );
}

export function IconBook(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 5a2 2 0 0 1 2-2h11v16H6a2 2 0 0 0-2 2z" />
      <path d="M4 19a2 2 0 0 0 2 2h11v-3" />
      <path d="M8 7h6M8 11h6" />
    </Icon>
  );
}

export function IconWifi(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 8.5a15 15 0 0 1 18 0M6 12a10 10 0 0 1 12 0M9 15.5a5 5 0 0 1 6 0" />
      <path d="M12 19h.01" />
    </Icon>
  );
}

export function IconWifiOff(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 8.5a15 15 0 0 1 6-3.4M21 8.5a15 15 0 0 0-5.5-3.2" />
      <path d="M6 12a10 10 0 0 1 4-2.2M18 12a10 10 0 0 0-2.5-1.6" />
      <path d="M9 15.5a5 5 0 0 1 4-.9" />
      <path d="M12 19h.01M4 4l16 16" />
    </Icon>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12.5 9.5 17 19 7.5" />
    </Icon>
  );
}

export function IconCheckDouble(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2 12.5 6 16.5 13 8.5" />
      <path d="M9 14.5l1.8 2L22 6.5" />
    </Icon>
  );
}

export function IconClock(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </Icon>
  );
}

export function IconImage(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="M5 17l4.5-4.5L13 16l3-2.5 3 3" />
    </Icon>
  );
}

export function IconFile(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
    </Icon>
  );
}

export function IconSpark(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.5 13.6 9 19 10.6 13.6 12.2 12 17.7 10.4 12.2 5 10.6 10.4 9z" />
      <path d="M18.5 16.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />
    </Icon>
  );
}

export function IconMore(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="5.5" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="12" cy="18.5" r="1.4" />
    </Icon>
  );
}

export function IconChat(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 5h16v11H9l-4 4v-4H4z" />
      <path d="M8 9h8M8 12h5" />
    </Icon>
  );
}

export function IconVideo(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="6" width="12" height="12" rx="2.5" />
      <path d="M15 10.5 21 7v10l-6-3.5z" />
    </Icon>
  );
}

export function IconPhone(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 3.5h3l1.5 4-2 1.5a12 12 0 0 0 5.5 5.5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4 5.7 2 2 0 0 1 6 3.5z" />
    </Icon>
  );
}

export function IconMic(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" />
    </Icon>
  );
}

export function IconStar(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />
    </Icon>
  );
}

export function IconStarFilled(props: IconProps) {
  return (
    <Icon fill="currentColor" {...props}>
      <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />
    </Icon>
  );
}

export function IconList(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
    </Icon>
  );
}

export function IconDownload(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3v12M7.5 10.5 12 15l4.5-4.5" />
      <path d="M4 19h16" />
    </Icon>
  );
}

export function IconFlag(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 21V4M6 4h11l-1.5 4L17 12H6" />
    </Icon>
  );
}

export function IconBlock(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M6.5 6.5l11 11" />
    </Icon>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.5a3.2 3.2 0 0 1 0 6M17.5 19a5.5 5.5 0 0 0-2-4.2" />
    </Icon>
  );
}

export function IconLocation(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 21s6.5-5.2 6.5-10.5a6.5 6.5 0 0 0-13 0C5.5 15.8 12 21 12 21z" />
      <circle cx="12" cy="10.5" r="2.4" />
    </Icon>
  );
}

export function IconCopy(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="8" y="8" width="12" height="12" rx="2.2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </Icon>
  );
}

export function IconInfo(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8h.01" />
    </Icon>
  );
}

export function IconMessagePlus(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 5h13v9H9l-4 4v-4H4z" />
      <path d="M18 3v6M15 6h6" />
    </Icon>
  );
}

export function IconPaint(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 5h16v6H4z" />
      <path d="M12 11v4a2 2 0 0 0 2 2h1a2 2 0 0 1 0 4h-1" />
      <path d="M7 8h.01M10 8h.01M13 8h.01" />
    </Icon>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.5 6 15 12l-5.5 6" />
    </Icon>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 7h14M10 7V5h4v2M6 7l1 13h10l1-13" />
      <path d="M10 11v6M14 11v6" />
    </Icon>
  );
}

export function IconReply(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 7 4 12l5 5" />
      <path d="M4 12h10a6 6 0 0 1 6 6v1" />
    </Icon>
  );
}

export function IconForward(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M15 7l5 5-5 5" />
      <path d="M20 12H10a6 6 0 0 0-6 6v1" />
    </Icon>
  );
}

export function IconPin(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 4h6l-1 5 3 3H7l3-3z" />
      <path d="M12 12v8" />
    </Icon>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 9.5 12 15l6-5.5" />
    </Icon>
  );
}

export function IconCamera(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
      <circle cx="12" cy="13" r="3.2" />
    </Icon>
  );
}

export function IconSticker(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 6a2 2 0 0 1 2-2h9l5 5v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M15 4v5h5" />
      <path d="M9 13a3.5 3.5 0 0 0 6 0" />
    </Icon>
  );
}

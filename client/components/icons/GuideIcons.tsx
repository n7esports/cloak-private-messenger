import type { SVGProps } from "react";

type GuideIconProps = SVGProps<SVGSVGElement>;

function GuideIcon({
  children,
  width = 20,
  height = 20,
  viewBox = "0 0 24 24",
  fill = "none",
  stroke = "currentColor",
  strokeWidth = 1.5,
  strokeLinecap = "round",
  strokeLinejoin = "round",
  ...props
}: GuideIconProps) {
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
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconLock(props: GuideIconProps) {
  return (
    <GuideIcon {...props}>
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <circle cx="12" cy="15" r="1" />
    </GuideIcon>
  );
}

export function IconNote(props: GuideIconProps) {
  return (
    <GuideIcon {...props}>
      <path d="M5 4h10l4 4v12H5z" />
      <path d="M15 4v4h4" />
      <path d="M8 13h8M8 16h5" />
    </GuideIcon>
  );
}

export function IconBroadcast(props: GuideIconProps) {
  return (
    <GuideIcon {...props}>
      <circle cx="12" cy="12" r="2" />
      <path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M6 6a8 8 0 0 0 0 12M18 6a8 8 0 0 1 0 12" />
    </GuideIcon>
  );
}

export function IconTimer(props: GuideIconProps) {
  return (
    <GuideIcon {...props}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2 2M9 2h6" />
    </GuideIcon>
  );
}

export function IconCheck(props: GuideIconProps) {
  return (
    <GuideIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </GuideIcon>
  );
}

export function IconShield(props: GuideIconProps) {
  return (
    <GuideIcon {...props}>
      <path d="M12 3l8 3v6c0 4.5-3.2 8.4-8 9-4.8-.6-8-4.5-8-9V6z" />
      <path d="M12 9v4M12 16h.01" />
    </GuideIcon>
  );
}

export function IconBackup(props: GuideIconProps) {
  return (
    <GuideIcon {...props}>
      <path d="M4 7v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7" />
      <path d="M4 7l8-4 8 4M12 3v10M9 10l3 3 3-3" />
    </GuideIcon>
  );
}

export function IconAutoLock(props: GuideIconProps) {
  return (
    <GuideIcon {...props}>
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <path d="M12 14v2" />
    </GuideIcon>
  );
}

export function IconOffline(props: GuideIconProps) {
  return (
    <GuideIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </GuideIcon>
  );
}

export function IconTor(props: GuideIconProps) {
  return (
    <GuideIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18M12 6a6 6 0 0 1 0 12M12 9a3 3 0 0 1 0 6" />
    </GuideIcon>
  );
}

export function IconSend(props: GuideIconProps) {
  return (
    <GuideIcon {...props}>
      <path d="M4 12l16-8-6 16-2.5-6.5z" />
      <path d="M11.5 13.5L20 4" />
    </GuideIcon>
  );
}

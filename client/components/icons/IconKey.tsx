import type { SVGProps } from "react";

export default function IconKey({
  size = 24,
  className,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="7.5" cy="17.5" r="3.5" />
      <line x1="10" y1="15" x2="20" y2="5" />
      <line x1="17" y1="8" x2="19" y2="10" />
      <line x1="14" y1="11" x2="16" y2="13" />
    </svg>
  );
}
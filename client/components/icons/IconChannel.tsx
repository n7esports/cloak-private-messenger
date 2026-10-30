import type { SVGProps } from "react";

export default function IconChannel({
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
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M2 12h20" />
      <path d="M2 17h20" />
      <path d="M2 7h20" />
      <rect x="4" y="3" width="16" height="18" rx="2" />
    </svg>
  );
}

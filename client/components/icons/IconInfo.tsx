import type { SVGProps } from "react";

export default function IconInfo({
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
      <path d="M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path d="M21 21l-3.5-3.5M17 11h.01" />
    </svg>
  );
}

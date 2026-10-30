import type { SVGProps } from "react";

export default function IconCheckDouble({
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
      <polyline points="18 8 9 17 4 12" />
      <polyline points="22 8 13 17" />
    </svg>
  );
}

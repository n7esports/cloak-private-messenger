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
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="7.5" cy="17.5" r="3.5" />
      <path d="M15 13l6-2.5" />
      <path d="M18 10.5l2-2" />
      <path d="M20 7.5l2-2" />
    </svg>
  );
}

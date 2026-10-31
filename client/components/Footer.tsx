"use client";

import Link from "next/link";

const LINKS = [
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/terms", label: "Terms" },
  { href: "/legal/cookies", label: "Cookies" },
  { href: "/legal/dpa", label: "DPA" },
  { href: "/legal/subprocessors", label: "Subprocessors" },
  { href: "/legal/security", label: "Security" },
  { href: "/legal/status", label: "Status" },
  { href: "/legal/contact", label: "Contact" },
  { href: "/legal/data-request", label: "Data request" },
  { href: "/legal/unsubscribe", label: "Unsubscribe" },
  { href: "/legal/cookies", label: "Cookie settings" },
  { href: "/legal/licenses", label: "Licenses" },
];

export default function Footer() {
  return (
    <footer className="border-t border-hairline p-4 text-xs text-on-surface-variant">
      <nav aria-label="Legal">
        {LINKS.map(({ href, label }, i) => (
          <span key={href}>
            <Link href={href} className="hover:underline">
              {label}
            </Link>
            {i < LINKS.length - 1 ? <span className="mx-1.5">·</span> : null}
          </span>
        ))}
      </nav>
    </footer>
  );
}

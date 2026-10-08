import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../src/styles/globals.css";

export const metadata: Metadata = {
  title: "Cloak Private Messenger",
  description: "A private, encrypted messaging vault.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

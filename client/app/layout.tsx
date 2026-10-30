import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import "./globals.css";
import "../styles/tokens.css";

export const metadata: Metadata = {
  title: "Cloak",
  description: "Ephemeral encrypted messenger",
};

export const viewport: Viewport = {
  themeColor: "#0a0e16",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans bg-surface text-on-surface antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

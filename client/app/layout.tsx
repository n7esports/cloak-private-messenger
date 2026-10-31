import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce");

  return (
    <html lang="en" className="dark">
      <head>
        {nonce && <meta name="x-nonce" content={nonce} />}
      </head>
      <body className="font-sans bg-surface text-on-surface antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

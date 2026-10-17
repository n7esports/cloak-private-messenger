import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ThemeProvider } from "../components/ThemeProvider";
import "../src/styles/globals.css";

export const metadata: Metadata = {
  title: "Cloak Private Messenger",
  description: "A private, encrypted messaging vault.",
  icons: {
    icon: "/favicon.svg",
  },
};

/**
 * Lock the layout viewport so the app never zooms or scrolls horizontally on
 * mobile. Images still scale inside their containers, so photos remain
 * pinch-zoomable where the OS allows it.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#09090b",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head></head>
      <body className="bg-gradient-to-br from-slate-100 via-emerald-50/40 to-teal-100/50 dark:from-gray-950 dark:via-slate-900 dark:to-zinc-950 min-h-screen">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

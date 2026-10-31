import { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://your-url.vercel.app";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/chats",
    "/chats/channels",
    "/chats/settings",
    "/lock",
    "/maintenance",
    "/setup/recovery",
    "/unlock/recovery",
    "/legal/privacy",
    "/legal/terms",
    "/legal/cookies",
    "/legal/cookie-settings",
    "/legal/dpa",
    "/legal/subprocessors",
    "/legal/security",
    "/legal/status",
    "/legal/contact",
    "/legal/data-request",
    "/legal/unsubscribe",
    "/legal/licenses",
  ];

  return routes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1 : 0.5,
  }));
}

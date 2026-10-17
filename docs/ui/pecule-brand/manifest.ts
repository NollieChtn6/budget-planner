// apps/web/app/manifest.ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pécule",
    short_name: "Pécule",
    description: "Mettre de côté, mois après mois.",
    lang: "fr",
    start_url: "/",
    display: "standalone",
    background_color: "#F4F5F1",
    theme_color: "#1C262E",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

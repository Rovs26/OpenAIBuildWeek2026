import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Basa Buddy",
    short_name: "Basa Buddy",
    description: "Adaptive literacy assessment for Filipino learners.",
    start_url: "/child",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFF8EB",
    theme_color: "#FFB703",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

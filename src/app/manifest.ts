import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cheesy Toast Vault",
    short_name: "CTV",
    description: "Your personal encrypted password book",
    start_url: "/",
    display: "standalone",
    background_color: "#fffbeb",
    theme_color: "#d97706",
    icons: [
      { src: "/icon.png", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}

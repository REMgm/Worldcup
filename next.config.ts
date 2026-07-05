import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "flagcdn.com" }, // demo flags
      { protocol: "https", hostname: "media.api-sports.io" }, // API-Football flags + licensed player photos
      { protocol: "https", hostname: "crests.football-data.org" }, // fallback provider crests
      { protocol: "https", hostname: "a.espncdn.com" }, // ESPN country flags
      { protocol: "https", hostname: "**.espncdn.com" },
      { protocol: "https", hostname: "svjepmqfemctnyzzyxwc.supabase.co" }, // Higgsfield caricatures via this project's storage
    ],
  },
};

export default nextConfig;

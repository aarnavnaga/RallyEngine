import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.pravatar.cc" },
      { protocol: "https", hostname: "p16-sign-va.tiktokcdn.com" },
      { protocol: "https", hostname: "p16-sign-sg.tiktokcdn.com" },
      { protocol: "https", hostname: "p19-sign-va.tiktokcdn.com" },
      { protocol: "https", hostname: "media.licdn.com" },
      { protocol: "https", hostname: "scontent.cdninstagram.com" },
      { protocol: "https", hostname: "**.tiktokcdn-us.com" },
      { protocol: "https", hostname: "**.tiktokcdn.com" },
    ],
  },
};
export default nextConfig;

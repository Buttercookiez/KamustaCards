import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // Required for Capacitor (static export)
  images: {
    unoptimized: true, // Required for static export (no server for image optimization)
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
// app/layout.tsx
import './globals.css';
import { SoundProvider } from "@/components/sound-provider";
import type { Metadata, Viewport } from "next";
import InstallBanner from "@/components/InstallBanner";
import FriendNotifications from "@/components/friend-notifications";

// ─── Metadata ─────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "Kamusta",
  description: "A card game for the conversations that matter.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kamusta",
    // Add your splash screens here once you generate them
    // startupImage: [{ url: "/splash/iphone.png" }],
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-192x192.png",
  },
  // Open Graph (for link previews)
  openGraph: {
    title: "Kamusta",
    description: "A card game for the conversations that matter.",
    type: "website",
  },
};

// ─── Viewport (theme color, viewport-fit for notch) ──────────────────────────
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" },
    { media: "(prefers-color-scheme: dark)",  color: "#09090b" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  userScalable: false,
};

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* iOS-specific meta tags not yet in Next.js metadata API */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Kamusta" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body>
        {/* ✅ children rendered ONCE, wrapped in SoundProvider */}
        <FriendNotifications />
        <SoundProvider>
          {children}
        </SoundProvider>
        <InstallBanner />
      </body>
    </html>
  );
}
import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppProvider from "@/components/AppProvider";

export const metadata: Metadata = {
  title: "Lord of the Rina – Family Travel Companion",
  description: "נבנה לזכרה של רינה – לעזור למשפחה ליצור חוויות וזיכרונות משותפים בטיולים.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "Rina", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#C8553D",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@500;700;900&family=Rubik:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <AppProvider>
          <div className="app">{children}</div>
        </AppProvider>
      </body>
    </html>
  );
}

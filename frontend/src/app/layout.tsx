import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppProvider from "@/components/AppProvider";
import Snow from "@/components/Snow";

export const metadata: Metadata = {
  title: "Lord of the Rina – Family Travel Companion",
  description: "ההלויז יוצאים לטייל בקולמר – אוכל, אטרקציות, שווקי כריסמס וניווט ב-Waze.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "Rina", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1C2541",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Cormorant+Garamond:ital,wght@1,500;1,600&family=Frank+Ruhl+Libre:wght@500;700;900&family=Rubik:wght@400;500;600;700&family=Suez+One&display=swap"
        />
      </head>
      <body>
        <Snow />
        <AppProvider>
          <div className="app">{children}</div>
        </AppProvider>
      </body>
    </html>
  );
}

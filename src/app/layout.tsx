import type { Metadata, Viewport } from "next";
import AntiScrapeProtectionShield from "@/src/components/AntiScrapeProtectionShield";
import AntiCloneSecurityKillswitch from "@/src/components/AntiCloneSecurityKillswitch";
import { DatabaseSetupBanner } from "@/src/components/DatabaseSetupBanner";
import "../index.css";

export const metadata: Metadata = {
  title: "Earning Hub - Powered by Saqib",
  description: "Join Earning Hub - Powered by Saqib. Earn daily rewards by completing simple tasks. Invite friends and earn extra commission on their package purchases.",
  openGraph: {
    type: "website",
    title: "Earning Hub - Powered by Saqib",
    description: "Earn daily rewards and referral bonuses on Pakistan's #1 premium earning platform. Start your journey today!",
    images: ["https://ik.imagekit.io/19imy4f1u/lite_1783801856823_8COA8zmhu.webp"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Earning Hub - Powered by Saqib",
    description: "Earn daily rewards and referral bonuses. Start your journey today!",
    images: ["https://ik.imagekit.io/19imy4f1u/lite_1783801856823_8COA8zmhu.webp"],
  },
  icons: {
    icon: "https://ik.imagekit.io/19imy4f1u/lite_1783801856823_8COA8zmhu.webp",
    apple: "https://ik.imagekit.io/19imy4f1u/lite_1783801856823_8COA8zmhu.webp",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#020617",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@400;500;700&family=Noto+Nastaliq+Urdu:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <DatabaseSetupBanner />
        <AntiScrapeProtectionShield />
        <AntiCloneSecurityKillswitch />
        {children}
      </body>
    </html>
  );
}

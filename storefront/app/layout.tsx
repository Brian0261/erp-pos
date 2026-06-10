import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { getStorefrontPublicBaseUrl, getStorefrontRobotsMetadata } from "@/lib/seo";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getStorefrontPublicBaseUrl()),
  title: "InkToy - Utiles escolares y pasamaneria",
  description: "Tienda de utiles escolares, papeleria y pasamaneria.",
  robots: getStorefrontRobotsMetadata(),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${dmSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

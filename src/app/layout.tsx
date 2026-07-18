import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import NextAbstractWalletProvider from "@/components/NextAbstractWalletProvider";
import { WalletHeader } from "@/components/wallet/WalletHeader";
import "./globals.css";


export const metadata: Metadata = {
  title: "ABSTRACK | Build Blocks on Beat",
  description:
    "Process real Abstract block activity as a rhythm game. Route transactions, build throughput, and publish your sequencer score onchain.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

// Abstract Fonts
const avenueMono = localFont({
  src: "../fonts/Avenue Mono.ttf",
  variable: "--font-avenue-mono",
  weight: "100, 900",
});

const roobert = localFont({
  src: [
    { path: "../fonts/Roobert-Light.ttf", weight: "300", style: "normal" },
    { path: "../fonts/Roobert-Regular.ttf", weight: "400", style: "normal" },
    { path: "../fonts/Roobert-Medium.ttf", weight: "500", style: "normal" },
    { path: "../fonts/Roobert-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../fonts/Roobert-Bold.ttf", weight: "700", style: "normal" },
    { path: "../fonts/Roobert-Heavy.ttf", weight: "800", style: "normal" },
  ],
  variable: "--font-roobert",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <NextAbstractWalletProvider>
        <body
          className={`${avenueMono.variable} ${roobert.variable} antialiased`}
        >
          <WalletHeader />
          {children}
          <Analytics />
        </body>
      </NextAbstractWalletProvider>
    </html>
  );
}

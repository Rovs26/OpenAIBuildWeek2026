import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SWRegister from "@/components/SWRegister";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Basa Buddy",
    template: "%s | Basa Buddy",
  },
  description:
    "A child-friendly, adaptive literacy assessment for Filipino learners.",
  applicationName: "Basa Buddy",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#f59e0b",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <SWRegister />
      </body>
    </html>
  );
}

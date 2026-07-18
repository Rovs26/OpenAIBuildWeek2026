import type { Metadata, Viewport } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import SWRegister from "@/components/SWRegister";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  display: "swap",
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
  themeColor: "#FFB703",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fil"
      className={`${nunito.variable} ${baloo.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <SWRegister />
      </body>
    </html>
  );
}

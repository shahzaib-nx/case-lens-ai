import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

import ClientWrapper from "@/components/ClientWrapper";
import ParticleBackground from "@/components/ParticleBackground";

export const metadata: Metadata = {
  title: "CaseLens AI - Private Case Study Analysis",
  description: "Secure, local AI analysis for medical case studies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <ParticleBackground />
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  );
}

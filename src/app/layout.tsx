import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "45 Engineering Tracker — Automotive Wiring Harness Management",
  description: "Centralized automotive wiring harness engineering management system replacing Excel trackers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

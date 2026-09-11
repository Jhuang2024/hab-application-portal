import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "H@B Application Portal",
  description: "Apply as a hacker or mentor. Review applications with a consistent rubric and blind review.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

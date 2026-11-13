import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mirror - AI Presentation & Interview Coach",
  description: "Next-generation AI speech and interview coach with on-device computer vision and episodic memory.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-gray-100 min-h-screen antialiased flex flex-col selection:bg-accent-blue/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/session-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nimbus AI - Intelligent Agent Platform",
  description: "AI-powered agent with advanced chat interface and memory",
};

// Initialize app on server startup
if (typeof window === 'undefined') {
  import('@/lib/startup').then(({ initializeApp }) => {
    initializeApp().catch(console.error);
  });
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

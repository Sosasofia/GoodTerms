import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
// @ts-ignore -- Next.js global stylesheet side-effect import
import "./globals.css";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GoodTerms",
  description: "Split expenses easily with GoodTerms",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider afterSignOutUrl="/groups">
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {children}
          <Toaster
            closeButton
            richColors
            position="bottom-right"
            icons={{
              success: null,
              error: null,
              info: null,
              warning: null,
              loading: null,
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}

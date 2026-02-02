import type { Metadata } from "next";
import { Geist_Mono, Rajdhani, Inter } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Meek - Microfinance Loan Management Software",
  description: "Cloud-based loan management system for microfinance institutions, SACCOs, and money lenders. Automate loan origination, tracking, and collections.",
  keywords: "loan management software, microfinance software, SACCO software, money lending software, loan tracking, loan origination",
  openGraph: {
    title: "Meek - Modern Loan Management Software",
    description: "Automate your lending operations with cloud-based loan management for microfinance institutions.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${rajdhani.variable} ${inter.variable} ${geistMono.variable} antialiased font-sans`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider>{children}</SessionProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

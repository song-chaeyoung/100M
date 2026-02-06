import type { Metadata, Viewport } from "next";
import "./globals.css";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";
import { SplashScreen } from "@/components/splash-screen";

const pretendard = localFont({
  src: "../public/fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  fallback: [
    "-apple-system",
    "BlinkMacSystemFont",
    "system-ui",
    "Roboto",
    "sans-serif",
  ],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: {
    default: "일억모으기",
    template: "%s | 일억모으기",
  },
  description: "열심히 기록하고 일억모으자!",
  keywords: [
    "가계부",
    "자산관리",
    "저축",
    "지출관리",
    "목표달성",
    "일억모으기",
  ],
  authors: [{ name: "일억모으기" }],
  openGraph: {
    title: "일억모으기",
    description: "열심히 기록하고 일억모으자!",
    type: "website",
    locale: "ko_KR",
    siteName: "일억모으기",
    images: [
      {
        url: "/logo.PNG",
        width: 1200,
        height: 630,
        alt: "일억모으기",
      },
    ],
  },
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    apple: "/logo.PNG",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${pretendard.variable} font-sans antialiased`}>
        <SplashScreen />
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

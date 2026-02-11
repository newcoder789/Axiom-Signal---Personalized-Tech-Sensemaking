import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import NotificationManager from "./components/NotificationManager";
import { Toaster } from '@/lib/toast';
import { ClientProvider } from './providers';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Axiom Signal",
  description: "AI-powered decision-making for tech choices",
};

import { NotificationProvider } from './notifications/NotificationContext';
import { NotificationCenter } from './notifications/NotificationCenter';
import PageTransition from "./components/ui/PageTransition";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ClientProvider>
          <NotificationProvider>
            <div className="app-layout">
              <Sidebar />
              <div className="main-wrapper">
                <Navbar />
                <main className="main-content">
                  <PageTransition>
                    {children}
                  </PageTransition>
                </main>
              </div>
            </div>
            <NotificationCenter />
            <Toaster />
          </NotificationProvider>
        </ClientProvider>
      </body>
    </html>
  );
}


"use client";

import { Inter } from "next/font/google";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { PrivyProvider } from "@privy-io/react-auth";
import { AuthProvider } from "@/components/auth-provider";
import { usePrivy } from "@privy-io/react-auth";
import { useState } from "react";
import "./globals.css";
import type React from "react";
import { initMoralis } from "@/lib/moralis-init";

const inter = Inter({ subsets: ["latin"] });

// Initialize Moralis
initMoralis();

// Create a wrapper component for the authenticated layout
function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { authenticated } = usePrivy();

  if (!authenticated) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen">
        <AppSidebar />
        <main
          className={`flex-1 overflow-y-auto bg-background ${
            isSidebarCollapsed ? "ml-12" : "ml-56"
          }`}
        >
          <div className="h-full">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <PrivyProvider
          appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
          config={{
            loginMethods: ["email", "wallet", "google"],
            appearance: {
              theme: "light",
              accentColor: "#676FFF",
            },
          }}
        >
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <AuthProvider>
              <AuthenticatedLayout>{children}</AuthenticatedLayout>
            </AuthProvider>
          </ThemeProvider>
        </PrivyProvider>
      </body>
    </html>
  );
}

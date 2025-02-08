"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { authenticated, ready } = usePrivy();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Make sure we're on the client side and Privy is ready
    if (typeof window !== "undefined" && ready) {
      if (!authenticated && pathname !== "/login") {
        router.replace("/login");
      }
    }
  }, [ready, authenticated, router, pathname]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Allow access to login page without authentication
  if (pathname === "/login") {
    return <>{children}</>;
  }

  // Protect all other routes
  if (!authenticated) {
    return null;
  }

  return <>{children}</>;
}

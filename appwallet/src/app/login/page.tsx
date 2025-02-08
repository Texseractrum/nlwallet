"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const { login, authenticated, ready } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (ready && authenticated) {
      router.push("/dashboard");
    }
  }, [ready, authenticated, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="bg-card p-8 rounded-xl shadow-lg max-w-md w-full mx-4">
        <h1 className="text-3xl font-bold mb-6 text-center text-foreground">
          Welcome to Poxui
        </h1>
        <p className="text-muted-foreground mb-8 text-center">
          Connect your wallet or sign in with email to continue
        </p>
        <Button onClick={login} className="w-full py-6 text-lg">
          Login with Privy
        </Button>
      </div>
    </div>
  );
}

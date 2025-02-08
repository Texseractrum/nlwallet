"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getWalletBalance,
  getTokenBalances,
  TokenBalance,
} from "@/lib/moralis";
import { formatEther } from "viem";

export function WalletInfo() {
  const { user } = usePrivy();
  const [ethBalance, setEthBalance] = useState<string>("0");
  const [usdValue, setUsdValue] = useState<number>(0);
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBalances() {
      if (!user?.wallet?.address) return;

      try {
        const [balance, tokenBalances] = await Promise.all([
          getWalletBalance(user.wallet.address),
          getTokenBalances(user.wallet.address),
        ]);

        const ethBalanceValue = formatEther(
          BigInt(balance.native.balance.toString())
        );
        setEthBalance(ethBalanceValue);
        setTokens(tokenBalances);

        // Calculate USD value using the direct balance value
        const ethPrice = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
        )
          .then((res) => res.json())
          .then((data) => data.ethereum.usd);

        setUsdValue(Number(ethBalanceValue) * ethPrice);
      } catch (error) {
        console.error("Error fetching balances:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchBalances();
  }, [user?.wallet?.address]);

  if (isLoading) {
    return (
      <Card>
        <CardContent>Loading...</CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden bg-card">
      <CardHeader>
        <CardTitle className="text-card-foreground">Wallet Balance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-2xl font-bold text-card-foreground">
              ${usdValue.toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground">{ethBalance} ETH</p>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium border-b pb-2 text-card-foreground">
              Tokens
            </h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {tokens.map((token) => (
                <div
                  key={token.token_address}
                  className="flex items-center justify-between py-1 hover:bg-muted/50 rounded-lg px-2"
                >
                  <div className="flex items-center gap-2">
                    {token.logo && (
                      <img
                        src={token.logo}
                        alt={token.symbol}
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    <div>
                      <p className="font-medium text-card-foreground">
                        {token.symbol}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {token.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-card-foreground">
                      {formatEther(BigInt(token.balance))}
                    </p>
                    {token.price && (
                      <p className="text-xs text-muted-foreground">
                        $
                        {(
                          Number(formatEther(BigInt(token.balance))) *
                          token.price
                        ).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

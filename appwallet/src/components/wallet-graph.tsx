"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getHistoricalPortfolioValue } from "@/lib/moralis";

interface DataPoint {
  date: string;
  value: number;
}

export function WalletGraph() {
  const { user } = usePrivy();
  const [data, setData] = useState<DataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPortfolioData() {
      if (!user?.wallet?.address) return;

      try {
        const historicalData = await getHistoricalPortfolioValue(
          user.wallet.address
        );
        const formattedData = historicalData.map((item) => ({
          date: new Date(item.date).toLocaleDateString(),
          value: item.value,
        }));
        setData(formattedData);
      } catch (error) {
        console.error("Error fetching portfolio data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPortfolioData();
  }, [user?.wallet?.address]);

  if (isLoading) {
    return (
      <Card>
        <CardContent>Loading...</CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Portfolio Value</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip
              formatter={(value: number) => [`$${value.toFixed(2)}`, "Value"]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getWalletTransactions, Transaction } from "@/lib/moralis";
import { formatEther } from "viem";

export function WalletActivity() {
  const { user } = usePrivy();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTransactions() {
      if (!user?.wallet?.address) return;

      try {
        const txs = await getWalletTransactions(user.wallet.address);
        setTransactions(
          txs.map((tx) => ({
            from_address: tx.from.toString(),
            to_address: tx.to?.toString() || "",
            gas: tx.gas?.toString() || "0",
            gas_price: tx.gasPrice.toString(),
            block_timestamp: tx.blockTimestamp.toISOString(),
            block_number: tx.blockNumber.toString(),
            hash: tx.hash,
            value: tx.value?.toString() || "0",
          }))
        );
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTransactions();
  }, [user?.wallet?.address]);

  function getTransactionType(tx: Transaction, userAddress: string) {
    const address = userAddress.toLowerCase();
    if (tx.from_address.toLowerCase() === address) return "Send";
    if (tx.to_address.toLowerCase() === address) return "Receive";
    return "Interact";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Amount (ETH)</TableHead>
              <TableHead>Hash</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <div className="flex justify-center py-4">Loading...</div>
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => (
                <TableRow key={tx.hash}>
                  <TableCell>
                    {getTransactionType(tx, user?.wallet?.address || "")}
                  </TableCell>
                  <TableCell>{formatEther(BigInt(tx.value))}</TableCell>
                  <TableCell>
                    <a
                      href={`https://etherscan.io/tx/${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      {tx.hash.slice(0, 6)}...{tx.hash.slice(-4)}
                    </a>
                  </TableCell>
                  <TableCell>
                    {new Date(tx.block_timestamp).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

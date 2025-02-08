"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

const prompts = [
  "How can I check my BNB balance?",
  "What's the current gas price on Avalanche?",
  "How do I swap tokens on PancakeSwap?",
  "What are the top NFT collections on BNB Chain?",
  "How can I stake AVAX?",
  "What's the TVL of Trader Joe on Avalanche?",
  "How do I bridge assets from Ethereum to BNB Chain?",
  "What's the APY for liquidity pools on Avalanche?",
  "How can I participate in IDOs on BNB Chain?",
  "What are the best DeFi protocols on Avalanche?",
];

export default function Home() {
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [promptIndex, setPromptIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    const typingInterval = setInterval(() => {
      if (charIndex < prompts[promptIndex].length) {
        setCurrentPrompt((prev) => prev + prompts[promptIndex][charIndex]);
        setCharIndex((prev) => prev + 1);
      } else {
        clearInterval(typingInterval);
        setTimeout(() => {
          setCurrentPrompt("");
          setCharIndex(0);
          setPromptIndex((prev) => (prev + 1) % prompts.length);
        }, 2000); // Wait for 2 seconds before starting the next prompt
      }
    }, 100); // Adjust typing speed here

    return () => clearInterval(typingInterval);
  }, [promptIndex, charIndex]);

  return (
    <div className="flex items-center min-h-[calc(100vh-4rem)] p-6 pl-24">
      <div className="text-center space-y-6 max-w-2xl w-full px-4">
        <h1 className="text-4xl font-bold mb-8">
          Welcome to Poxui incorporated
        </h1>
        <h2 className="text-2xl font-semibold mb-4">
          What can I help you with?
        </h2>
        <Input placeholder={currentPrompt} className="text-lg w-full" />
        <p className="text-sm text-muted-foreground">
          Type your question about BNB Chain or Avalanche blockchain
        </p>
      </div>
    </div>
  );
}

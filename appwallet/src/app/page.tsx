"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [promptIndex, setPromptIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [userInput, setUserInput] = useState("");

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

  const handleInputSubmit = async (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter" && userInput.trim()) {
      try {
        const response = await fetch("http://localhost:5001/select-chain", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ input: userInput }),
        });

        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        const { agentId } = await response.json();

        // Redirect to agents page with the selected agent ID
        router.push(`/agents?agentId=${agentId}`);

        // Clear input after sending
        setUserInput("");
      } catch (error) {
        console.error("Error:", error);
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center sm:-mt-8 md:-mt-16 lg:-mt-20 sm:pl-24 md:pl-40 lg:pl-64">
      <div className="text-center space-y-6 max-w-2xl w-full px-4">
        <div className="mb-8">
          <Image
            src="/200w.gif"
            alt="Black spiral animation"
            width={200}
            height={200}
            priority
            className="mx-auto"
          />
        </div>

        <h1 className="text-4xl font-bold mb-8">Welcome to Sunset</h1>
        <h2 className="text-2xl font-semibold mb-4">
          What can I help you with?
        </h2>
        <Input
          placeholder={currentPrompt}
          className="text-lg w-full"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyPress={handleInputSubmit}
        />
        <p className="text-sm text-muted-foreground">
          Type your question about BNB Chain or Avalanche blockchain
        </p>
      </div>
    </div>
  );
}

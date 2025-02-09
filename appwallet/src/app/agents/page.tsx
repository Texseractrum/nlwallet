"use client";

import { useState } from "react";
import { AgentBox } from "@/components/agent-box";
import { ChatBox } from "@/components/chat-box";

const agents = [
  { id: 1, name: "BNB Agent 🔶" },
  { id: 2, name: "Avalanche Agent 🔴" },
  { id: 3, name: "Solana Agent 🟢" },
];

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);

  return (
    <div className="space-y-6 p-6 pl-24">
      <h1 className="text-3xl font-bold">Agents</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <AgentBox
            key={agent.id}
            agent={agent}
            onClick={() => setSelectedAgent(agent.id)}
          />
        ))}
      </div>
      {selectedAgent && (
        <div className="fixed inset-y-0 right-0 z-50 w-[calc(100%-16rem)] bg-background">
          <ChatBox
            agentId={selectedAgent.toString()}
            onClose={() => setSelectedAgent(null)}
          />
        </div>
      )}
    </div>
  );
}

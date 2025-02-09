"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AgentBox } from "@/components/agent-box";
import { ChatBox } from "@/components/chat-box";

const agents = [
  { id: 1, name: "BNB Agent 🔶" },
  { id: 2, name: "Avalanche Agent 🔴" },
  { id: 3, name: "Solana Agent 🟢" },
];

export default function AgentsPage() {
  const searchParams = useSearchParams();
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);

  useEffect(() => {
    const agentId = searchParams.get("agentId");
    if (agentId) {
      setSelectedAgent(parseInt(agentId, 10));
    }
  }, [searchParams]);

  const handleAgentClick = (agentId: number) => {
    setSelectedAgent(agentId);
  };

  return (
    <div className="space-y-6 p-6 pl-24">
      <h1 className="text-3xl font-bold">Agents</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <AgentBox
            key={agent.id}
            agent={agent}
            onClick={() => handleAgentClick(agent.id)}
          />
        ))}
      </div>
      {selectedAgent && (
        <ChatBox
          agentId={selectedAgent.toString()}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </div>
  );
}

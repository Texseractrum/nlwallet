import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Agent {
  id: number
  name: string
}

export function AgentBox({ agent, onClick }: { agent: Agent; onClick: () => void }) {
  return (
    <Card className="hover:bg-accent transition-colors cursor-pointer" onClick={onClick}>
      <CardHeader>
        <CardTitle>{agent.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Click to chat with this agent</p>
      </CardContent>
    </Card>
  )
}


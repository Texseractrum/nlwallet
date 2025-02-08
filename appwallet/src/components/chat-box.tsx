"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X } from "lucide-react"

interface Message {
  role: "user" | "agent"
  content: string
}

export function ChatBox({ agentId, onClose }: { agentId: string; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [currentResponse, setCurrentResponse] = useState("")
  const [isTyping, setIsTyping] = useState(false)

  const handleSendMessage = () => {
    if (input.trim()) {
      setMessages([...messages, { role: "user", content: input }])
      setInput("")
      simulateAgentResponse()
    }
  }

  const simulateAgentResponse = () => {
    setIsTyping(true)
    const response = `Hello! I'm Agent ${agentId}. How can I assist you today?`
    let index = 0

    const typingInterval = setInterval(() => {
      if (index < response.length) {
        setCurrentResponse((prev) => prev + response[index])
        index++
      } else {
        clearInterval(typingInterval)
        setMessages((prevMessages) => [...prevMessages, { role: "agent", content: response }])
        setCurrentResponse("")
        setIsTyping(false)
      }
    }, 50) // Adjust the typing speed here
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-2xl font-bold">Agent {agentId}</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-6 w-6" />
        </Button>
      </div>
      <ScrollArea className="flex-grow p-4">
        {messages.map((message, index) => (
          <div key={index} className={`mb-4 ${message.role === "user" ? "text-right" : "text-left"}`}>
            <span
              className={`inline-block p-2 rounded-lg ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {message.content}
            </span>
          </div>
        ))}
        {isTyping && (
          <div className="text-left">
            <span className="inline-block p-2 rounded-lg bg-secondary text-secondary-foreground">
              {currentResponse}
              <span className="animate-pulse">|</span>
            </span>
          </div>
        )}
      </ScrollArea>
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
          />
          <Button onClick={handleSendMessage}>Send</Button>
        </div>
      </div>
    </div>
  )
}


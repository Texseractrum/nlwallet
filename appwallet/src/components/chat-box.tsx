"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DOMPurify from "dompurify";
import LoadingDots from "@/components/ui/loading-dots";

interface Message {
  role: "user" | "agent";
  content: string;
  isJson?: boolean;
  isHtml?: boolean;
}

declare global {
  interface Window {
    handleConfirm: (operation: string) => Promise<void>;
    handleReject: () => void;
  }
}

export function ChatBox({
  agentId,
  onClose,
}: {
  agentId: string;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const getEndpoint = (id: string) => {
    switch (id) {
      case "1":
        return "/bnb";
      case "2":
        return "/avalanche";
      case "3":
        return "/solana";
      default:
        return "/bnb";
    }
  };

  const getChainName = (id: string) => {
    switch (id) {
      case "1":
        return "BNB Agent 🔶";
      case "2":
        return "Avalanche Agent 🔴";
      case "3":
        return "Solana Agent 🟢";
      default:
        return "Chat";
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { role: "user", content: input }]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(
        `http://localhost:5001${getEndpoint(agentId)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ input: input }),
        }
      );

      const data = await response.json();
      let formattedContent = "";
      if (data.response) {
        try {
          const parsedResponse = JSON.parse(data.response);
          // Define handlers before using them in the HTML
          window.handleConfirm = async (operation: string) => {
            try {
              const response = await fetch("http://localhost:5001/confirm", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ operation: operation }),
              });

              const result = await response.json();
              if (result.status === "success") {
                console.log(`${operation.toUpperCase()} in progress...`);
                onClose();
              }
            } catch (error) {
              console.error("Error:", error);
            }
          };

          window.handleReject = () => {
            onClose();
          };

          formattedContent = `
            <div class="bg-muted rounded-lg p-6 inline-block min-w-[300px] shadow-sm border-2 border-primary">
              <div class="text-xl font-bold mb-4 pb-3 border-b border-primary/20">${parsedResponse.operation.toUpperCase()}</div>
              <div class="space-y-3 mb-4">
                <div class="text-base font-medium">Token 1: <span class="font-normal">${
                  parsedResponse.token1
                }</span></div>
                ${
                  parsedResponse.token2
                    ? `<div class="text-base font-medium">Token 2: <span class="font-normal">${parsedResponse.token2}</span></div>`
                    : ""
                }
                ${
                  parsedResponse.amount
                    ? `<div class="text-base font-medium">Amount: <span class="font-normal">${parsedResponse.amount}</span></div>`
                    : ""
                }
              </div>
              <div class="flex justify-center space-x-6">
                <button onclick="window.handleReject()" class="p-3 rounded-md bg-red-100 text-red-600 hover:bg-red-200 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
                <button onclick="window.handleConfirm('${
                  parsedResponse.operation
                }')" class="p-3 rounded-md bg-green-100 text-green-600 hover:bg-green-200 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </button>
              </div>
            </div>
          `;

          setMessages((prev) => [
            ...prev,
            {
              role: "agent",
              content: formattedContent,
              isHtml: true,
            },
          ]);
        } catch {
          formattedContent = data.response;
          setMessages((prev) => [
            ...prev,
            {
              role: "agent",
              content: formattedContent,
              isHtml: false,
            },
          ]);
        }
      } else {
        formattedContent = JSON.stringify(data, null, 2);
        setMessages((prev) => [
          ...prev,
          {
            role: "agent",
            content: formattedContent,
            isHtml: false,
          },
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content: "Sorry, there was an error processing your request.",
          isHtml: false,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    // Add confirmation logic here
    console.log("Transaction confirmed");
  };

  const handleReject = () => {
    // Add rejection logic here
    console.log("Transaction rejected");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-2xl font-bold">{getChainName(agentId)}</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-6 w-6" />
        </Button>
      </div>
      <ScrollArea className="flex-grow p-4">
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className={`mb-4 ${
                message.role === "user" ? "text-right" : "text-left"
              }`}
            >
              {message.isJson ? (
                <pre className="bg-secondary p-4 rounded-lg overflow-x-auto">
                  <code>{message.content}</code>
                </pre>
              ) : message.isHtml ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(message.content),
                  }}
                  className="inline-block"
                />
              ) : (
                <span
                  className={`inline-block p-2 rounded-lg ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {message.content.startsWith('{ "response":')
                    ? JSON.parse(message.content).response
                    : message.content}
                </span>
              )}
            </motion.div>
          ))}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-left"
            >
              <span className="inline-block p-2 rounded-lg bg-muted">
                <LoadingDots />
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </ScrollArea>
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            disabled={isLoading}
          />
          <Button onClick={handleSendMessage} disabled={isLoading}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

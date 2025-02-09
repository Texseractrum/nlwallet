"use client";

import { useState, useEffect } from "react";
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
          if (parsedResponse.operation) {
            formattedContent = `
              <div class="bg-muted rounded-lg p-4 inline-block min-w-[200px] shadow-sm border-2 border-primary">
                <div class="text-sm">${parsedResponse.response}</div>
                <div class="flex justify-end space-x-2 mt-2">
                  <button 
                    data-action="reject"
                    class="p-3 rounded-md bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                  <button 
                    data-action="confirm"
                    data-operation='${JSON.stringify(parsedResponse)}'
                    class="p-3 rounded-md bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                </div>
              </div>
            `;
            setMessages((prev) => [
              ...prev,
              { role: "agent", content: formattedContent, isHtml: true },
            ]);
          } else {
            // Not a transaction, show just the content directly
            setMessages((prev) => [
              ...prev,
              {
                role: "agent",
                content: data.response,
                isHtml: false,
              },
            ]);
          }
        } catch {
          // If parsing fails, show the response content directly
          setMessages((prev) => [
            ...prev,
            {
              role: "agent",
              content: data.response,
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

  const handleConfirm = async (operation: string) => {
    try {
      const operationData = JSON.parse(operation);
      console.log("Operation data received:", operationData);

      const chainEndpoint = getEndpoint(agentId);
      console.log("Using chain endpoint:", chainEndpoint);

      const response = await fetch(
        `http://localhost:5001${chainEndpoint}/confirm`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(operationData),
        }
      );

      const data = await response.json();
      console.log("Response from server:", data);

      if (data.status === "success") {
        let message = data.response;
        if (data.txHash) {
          message += `\nTransaction Hash: ${data.txHash}`;
        }

        setMessages((prev) => [
          ...prev,
          {
            role: "agent",
            content: message,
            isHtml: false,
          },
        ]);
      } else {
        throw new Error(data.message || "Transaction failed");
      }
    } catch (error) {
      console.error("Error in handleConfirm:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Error confirming transaction";
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content: `Error: ${errorMessage}`,
          isHtml: false,
        },
      ]);
    }
  };

  const handleReject = () => {
    setMessages((prev) => [
      ...prev,
      {
        role: "agent",
        content: "Transaction cancelled",
        isHtml: false,
      },
    ]);
  };

  // Add this new function to handle button clicks
  const handleButtonClick = (event: MouseEvent) => {
    const button = (event.target as HTMLElement).closest("button");
    if (!button) return;

    const action = button.getAttribute("data-action");
    const operation = button.getAttribute("data-operation");
    const container = button.closest(".bg-muted");

    if (container) {
      (container as HTMLElement).style.pointerEvents = "none";
      (container as HTMLElement).style.opacity = "0.5";
    }

    if (action === "confirm" && operation) {
      handleConfirm(operation);
    } else if (action === "reject") {
      handleReject();
    }
  };

  // Add event listener when component mounts
  useEffect(() => {
    document.addEventListener("click", handleButtonClick);
    return () => {
      document.removeEventListener("click", handleButtonClick);
    };
  }, []);

  // Assign the handlers to the window object
  if (typeof window !== "undefined") {
    window.handleConfirm = handleConfirm;
    window.handleReject = handleReject;
  }

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

"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { queryFlowise } from "../lib/actions/flowise";
import socketIOClient from "socket.io-client";
import { CornerDownLeft } from 'lucide-react';
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"
 
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

export default function Home() {
  const [messages, setMessages] = useState<{ role: "userMessage" | "apiMessage"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [socketIOClientId, setSocketIOClientId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const exampleMessages = [
    { heading: "What are some", subheading: "popular open source projects I can contribute to?", message: "What are some popular open source projects I can contribute to?" },
    { heading: "What are some", subheading: "popular open source projects I can contribute to?", message: "What are some popular open source projects I can contribute to?" },
  ];

  useEffect(() => {
    const socket = socketIOClient(process.env.NEXT_PUBLIC_FLOWISE_BASE_URL ?? "http://localhost:3000");

    const socketEvents = {
      connect: () => {
        console.log("Connected with ID:", socket.id);
        setSocketIOClientId(socket.id ?? "");
      },
      start: () => {
        console.log("LLM started streaming");
        setMessages(prevMessages => [...prevMessages, { role: "apiMessage", content: "" }]);
      },
      token: (token: string) => {
        setMessages(prevMessages => {
          const updatedMessages = [...prevMessages];
          const lastMessage = updatedMessages[updatedMessages.length - 1];
          if (lastMessage?.role === "apiMessage") {
            return [...updatedMessages.slice(0, -1), { ...lastMessage, content: lastMessage.content + token }];
          }
          return updatedMessages;
        });
      },
      end: () => console.log("LLM finished streaming"),
      abort: () => console.log("Execution aborted"),
    };

    Object.entries(socketEvents).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    return () => {
      console.log("Disconnecting socket");
      socket.disconnect();
    };
  }, []);

  const resizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    resizeTextarea();
  }, [input]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    resizeTextarea();
  };

  const sendMessage = async (message?: string) => {
    if ((!input.trim() && !message) || isLoading) return;

    const newMessage = message || input;
    setMessages(prev => [...prev, { role: "userMessage", content: newMessage }]);
    setInput("");
    setIsLoading(true);

    try {
      await queryFlowise({
        question: newMessage,
        history: messages.map(msg => ({ role: msg.role, content: msg.content })),
        socketIOClientId,
      });
    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [
        ...prev,
        { role: "apiMessage", content: "Oops! Something went wrong. Please try again or ask a different question." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <ThemeProvider attribute="class">
      <div className="flex flex-col h-[calc(100vh-3.5rem)] relative">
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            {messages.length === 0 ? (
              <>
                {/* Welcome message */}
                <Card className="p-6">
                  <CardHeader>
                    <CardTitle>Welcome to GINDER!</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>
                      This chatbot is a tool to help you find the perfect open
                      source repository to contribute to.
                    </p>
                    <p>Here are some instructions to get started:</p>
                    <ul className="list-disc pl-6 mt-2">
                      <li>
                        Connect your GitHub account to GINDER in "Data" section
                      </li>
                      <li>Let the chatbot know your skills and interests</li>
                      <li>The chatbot will suggest repositories to you</li>
                      <li>
                        Add repositories to "Repositories" section to monitor open
                        issues
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`mb-4 flex ${message.role === "userMessage" ? "justify-end" : "justify-start"}`}
                  >
                    {message.role === "apiMessage" && (
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center mr-2">
                        <span className="text-sm">🤖</span>
                      </div>
                    )}
                    <div
                      className={`rounded-lg p-3 max-w-[70%] ${message.role === "userMessage"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200 text-gray-800"
                        }`}
                    >
                      {message.content}
                    </div>
                    {message.role === "userMessage" && (
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center ml-2">
                        <span className="text-sm text-white">👤</span>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </ScrollArea>
        
        {/* Example messages */}
        <div className="p-4 border-t bg-white dark:bg-zinc-950">
          <div className="max-w-2xl mx-auto">
            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {exampleMessages.map((example, index) => (
                <div
                  key={index}
                  className={`cursor-pointer rounded-lg border bg-white p-4 hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900 ${
                    index > 1 && 'hidden md:block'
                  }`}
                  onClick={() => {
                    sendMessage(example.message);
                  }}
                >
                  <div className="text-sm font-semibold dark:text-white">{example.heading}</div>
                  <div className="text-sm text-zinc-600 dark:text-white">
                    {example.subheading}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Send message area */}
        <div className="p-4 border-t">
          <div className="max-w-2xl mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex flex-col md:flex-row space-x-2 items-center"
            >
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Send a message."
                className="flex-1 min-h-[50px] p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800"
              >
                <CornerDownLeft size={24} />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
};

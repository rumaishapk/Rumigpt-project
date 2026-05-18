"use client";

import { useState } from "react";
import axios from "axios";

const initialMessages = [{ role: "ai", text: "Hello! Where should we start?" }];

export default function Homepage() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");

  const sendChat = async () => {
    if (!input.trim()) return;

    const message = input.trim();

    setMessages((current) => [...current, { role: "user", text: message }]);
    setInput("");

    try {
      const response = await axios.post("/api/chat", { message });
      const reply =
        typeof response.data?.reply === "string"
          ? response.data.reply
          : "I couldn't generate a response.";

      setMessages((current) => [...current, { role: "ai", text: reply }]);
    } catch (error) {
      console.error("Error:", error);
      setMessages((current) => [
        ...current,
        {
          role: "ai",
          text: "Something went wrong while sending your message.",
        },
      ]);
    }
  };

  return (
    <div className="flex h-screen bg-[#212121] text-white">
      <div className="hidden w-64 bg-[#171717] p-4 md:block">
        <button className="w-full rounded-md border border-gray-600 p-2 text-sm hover:bg-gray-800">
          + New Chat
        </button>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div className="mx-auto max-w-2xl">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`mb-2 rounded-lg p-4 ${msg.role === "user" ? "bg-[#2f2f2f]" : "bg-transparent"}`}
              >
                <p className="mb-1 text-xs font-bold uppercase text-gray-400">
                  {msg.role === "user" ? "You" : "RumiGPT"}
                </p>
                <p className="text-gray-200">{msg.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6">
          <div className="mx-auto flex max-w-2xl gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder="Ask anything..."
              className="flex-1 rounded-lg border-none bg-[#2f2f2f] p-3 focus:outline-none"
            />
            <button
              onClick={sendChat}
              className="rounded-lg bg-white px-4 py-2 font-bold text-black"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

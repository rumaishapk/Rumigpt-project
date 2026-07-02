"use client";

import { useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";
import PdfUploader from "./components/PdfUploader";

type Message = {
  role: "ai" | "user";
  text: string;
  fileName?: string;
};

type ChatSubmit = {
  message: string;
  fileName?: string;
};

const initialMessages: Message[] = [
  { role: "ai", text: "Hello! Where should we start?" },
];

const STREAM_WORD_DELAY_MS = 35;

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function splitIntoWordTokens(text: string) {
  return text.match(/\S+\s*/g) || [];
}

export default function Homepage() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages]);

  const sendChat = async ({ message, fileName }: ChatSubmit) => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage && !fileName) return;

    setIsSending(true);
    setMessages((current) => [
      ...current,
      {
        role: "user",
        text: trimmedMessage || "Uploaded a PDF.",
        fileName,
      },
    ]);
    setInput("");

    if (!trimmedMessage) {
      setMessages((current) => [
        ...current,
        {
          role: "ai",
          text: "PDF uploaded. Ask me what you want to do with it.",
        },
      ]);
      setIsSending(false);
      return;
    }

    try {
      const aiMessageIndex = messages.length + 1;

      setMessages((current) => [
        ...current,
        { role: "ai", text: "Thinking..." },
      ]);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: trimmedMessage }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to stream response.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedText = "";

      const revealText = async (text: string) => {
        const tokens = splitIntoWordTokens(text);

        for (const token of tokens) {
          streamedText += token;

          setMessages((current) => {
            const updated = [...current];
            const aiMessage = updated[aiMessageIndex];

            if (aiMessage?.role === "ai") {
              updated[aiMessageIndex] = {
                ...aiMessage,
                text: streamedText,
              };
            }

            return updated;
          });

          await sleep(STREAM_WORD_DELAY_MS);
        }
      };

      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          const remainingText = decoder.decode();

          if (remainingText) {
            await revealText(remainingText);
          }

          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        await revealText(chunk);
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((current) => {
        const updated = [...current];
        const lastMessage = updated[updated.length - 1];

        if (lastMessage?.role === "ai") {
          updated[updated.length - 1] = {
            ...lastMessage,
            text: "Something went wrong while sending your message.",
          };

          return updated;
        }

        return [
          ...current,
          {
            role: "ai",
            text: "Something went wrong while sending your message.",
          },
        ];
      });
    } finally {
      setIsSending(false);
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
                {msg.fileName ? (
                  <div className="mb-3 inline-flex max-w-full items-center gap-2 rounded-lg border border-white/10 bg-[#3a3a3a] px-3 py-2 text-sm text-gray-100">
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="truncate">{msg.fileName}</span>
                  </div>
                ) : null}
                <p className="text-gray-200">{msg.text}</p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="p-6">
          <PdfUploader
            disabled={isSending}
            value={input}
            onChange={setInput}
            onSubmit={sendChat}
          />
        </div>
      </div>
    </div>
  );
}

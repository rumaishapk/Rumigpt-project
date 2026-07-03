import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { createEmbedding } from "@/lib/embeddings";
import { pineconeIndex } from "@/lib/pinecone";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message =
      typeof body?.message === "string" ? body.message.trim() : "";

    let chatId =
      typeof body?.chatId === "string" || typeof body?.chatId === "number"
        ? String(body.chatId).trim()
        : null;
    const documentId =
      typeof body?.documentId === "string" && body.documentId.trim()
        ? body.documentId.trim()
        : null;

    if (!message) {
      return NextResponse.json(
        { error: "A non-empty message is required." },
        { status: 400 },
      );
    }

    if (!chatId) {
      const title =
        message.length > 60 ? `${message.slice(0, 60)}...` : message;

      const chatResult = await pool.query(
        `
        INSERT INTO chats (title)
        VALUES ($1)
        RETURNING id
        `,
        [title],
      );

      chatId = String(chatResult.rows[0].id);
    }

    await pool.query(
      `
      INSERT INTO messages (chat_id, role, content)
      VALUES ($1, $2, $3)
      `,
      [chatId, "user", message],
    );

    let prompt = `
You are RumiGPT, a helpful assistant.

Answer the user's question clearly and naturally.

Question:
${message}
`;

    if (documentId) {
      const questionEmbedding = await createEmbedding(message);

      const searchResults = await pineconeIndex.query({
        vector: questionEmbedding,
        topK: 8,
        includeMetadata: true,
        filter: {
          documentId: { $eq: documentId },
        },
      });

      const context = searchResults.matches
        ?.map((match) => match.metadata?.text)
        .filter(Boolean)
        .join("\n\n");

      prompt = `
You are RumiGPT, a helpful RAG assistant.

Use the PDF context below to answer the user's question. If the answer is not present in the context, say you could not find that information in the uploaded PDF.

PDF context:
${context || "No relevant PDF context found."}

Question:
${message}
`;
    }

    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        let fullAssistantMessage = "";

        try {
          for await (const chunk of stream) {
            const text = chunk.text;

            if (text) {
              fullAssistantMessage += text;
              controller.enqueue(encoder.encode(text));
            }
          }

          await pool.query(
            `
            INSERT INTO messages (chat_id, role, content)
            VALUES ($1, $2, $3)
            `,
            [chatId, "assistant", fullAssistantMessage],
          );

          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Cache-Control": "no-cache, no-transform",
        "Content-Type": "text/plain; charset=utf-8",
        "X-Chat-Id": String(chatId),
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("Failed to handle chat request:", error);

    return NextResponse.json(
      { error: "Invalid request body or upstream chat failure." },
      { status: 500 },
    );
  }
}

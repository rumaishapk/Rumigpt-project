import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
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

    if (!message) {
      return NextResponse.json(
        { error: "A non-empty message is required." },
        { status: 400 },
      );
    }
    const questionEmbedding = await createEmbedding(message);

    const searchResults = await pineconeIndex.query({
      vector: questionEmbedding,
      topK: 5,
      includeMetadata: true,
    });

    const context = searchResults.matches
      ?.map((match) => match.metadata?.text)
      .filter(Boolean)
      .join("\n\n");

    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: `
You are RumiGPT, a helpful RAG assistant.

Answer the user's question using only the context below.
If the answer is not present in the context, say you don't know based on the uploaded PDF.

Context:
${context || "No relevant PDF context found."}

Question:
${message}
`,
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.text;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
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

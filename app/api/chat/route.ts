import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message =
      typeof body?.message === "string" ? body.message.trim() : "";

    if (!message) {
      return NextResponse.json(
        { error: "A non-empty message is required." },
        { status: 400 }
      );
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message,
    });

    return NextResponse.json({
      reply: response.text,
    });
  } catch (error) {
    console.error("Failed to handle chat request:", error);
    return NextResponse.json(
      { error: "Invalid request body or upstream chat failure." },
      { status: 500 }
    );
  }
}

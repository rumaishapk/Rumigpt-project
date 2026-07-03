import { NextResponse } from "next/server";
import pool from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const { chatId } = await params;

    const result = await pool.query(
      `
      SELECT id, role, content, created_at
      FROM messages
      WHERE chat_id = $1
      ORDER BY created_at ASC
      `,
      [chatId],
    );

    return NextResponse.json({
      messages: result.rows,
    });
  } catch (error) {
    console.error("Failed to load messages:", error);

    return NextResponse.json(
      { error: "Failed to load messages." },
      { status: 500 },
    );
  }
}

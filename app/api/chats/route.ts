import { NextResponse } from "next/server";
import pool from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT id, title, created_at
      FROM chats
      ORDER BY created_at DESC
    `);

    return NextResponse.json({
      chats: result.rows,
    });
  } catch (error) {
    console.error("Failed to load chats:", error);

    return NextResponse.json(
      { error: "Failed to load chats." },
      { status: 500 },
    );
  }
}

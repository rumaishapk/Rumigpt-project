import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";
import { PDFParse } from "pdf-parse";
import { chunkText } from "@/lib/chunkText";
import { createEmbedding } from "@/lib/embeddings";
import { pineconeIndex } from "@/lib/pinecone";

export const runtime = "nodejs";

PDFParse.setWorker(
  pathToFileURL(
    path.join(
      process.cwd(),
      "node_modules",
      "pdf-parse",
      "dist",
      "pdf-parse",
      "esm",
      "pdf.worker.mjs"
    )
  ).href
);

type ChunkMetadata = {
  documentId: string;
  filename: string;
  filepath: string;
  chunkIndex: number;
  text: string;
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      return NextResponse.json(
        { error: "Only PDF files are supported" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadDir = path.join(process.cwd(), "public", "uploads");

    await fs.mkdir(uploadDir, {
      recursive: true,
    });

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `${Date.now()}-${safeName}`;
    const documentId = fileName;
    const filepath = `/uploads/${fileName}`;
    const fullPath = path.join(uploadDir, fileName);

    await fs.writeFile(fullPath, buffer);

    const parser = new PDFParse({
      data: buffer,
    });
    const pdfData = await parser.getText();
    await parser.destroy();
    const text = pdfData.text.trim();

    if (!text) {
      return NextResponse.json(
        { error: "No readable text found in PDF" },
        { status: 400 }
      );
    }

    const chunks = chunkText(text);

    for (let i = 0; i < chunks.length; i += 50) {
      const batch = chunks.slice(i, i + 50);
      const records = await Promise.all(
        batch.map(async (chunk, batchIndex) => {
          const chunkIndex = i + batchIndex;
          const embedding = await createEmbedding(chunk);

          return {
            id: `${documentId}-${chunkIndex}`,
            values: embedding,
            metadata: {
              documentId,
              filename: file.name,
              filepath,
              chunkIndex,
              text: chunk,
            } satisfies ChunkMetadata,
          };
        })
      );

      await pineconeIndex.upsert({
        records,
      });
    }

    return NextResponse.json({
      success: true,
      documentId,
      chunks: chunks.length,
    });
  } catch (error) {
    console.error("Upload failed:", error);

    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}

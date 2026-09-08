// Polyfill missing browser globals for PDF.js in Node environment
if (typeof (global as any).DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class DOMMatrix {};
}
if (typeof (global as any).ImageData === 'undefined') {
  (global as any).ImageData = class ImageData {};
}
if (typeof (global as any).Path2D === 'undefined') {
  (global as any).Path2D = class Path2D {};
}
import { NextRequest, NextResponse } from "next/server";
import ImageKit from "imagekit";

// Initialize ImageKit connection
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY!,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT!,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Convert PDF file into a buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload PDF to ImageKit
    const uploadResult = await imagekit.upload({
      file: buffer,                 // File buffer
      fileName: file.name,          // Original file name
      folder: "/rumigpt-documents", // Folder destination in ImageKit
    });

    console.log("Uploaded successfully to ImageKit:", uploadResult.url);

    return NextResponse.json({
      success: true,
      fileUrl: uploadResult.url,    // Public CDN URL of the uploaded PDF
      fileId: uploadResult.fileId,
      name: uploadResult.name,
    });
  } catch (error) {
    console.error("ImageKit upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload to ImageKit" },
      { status: 500 }
    );
  }
}







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

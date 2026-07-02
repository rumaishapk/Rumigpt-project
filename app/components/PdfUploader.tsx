"use client";

import { ChangeEvent, KeyboardEvent, useRef, useState } from "react";
import { FileText, Loader2, Plus, Send, X } from "lucide-react";

type PdfUploaderProps = {
  disabled?: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (payload: { message: string; fileName?: string }) => Promise<void>;
};

export default function PdfUploader({
  disabled = false,
  value,
  onChange,
  onSubmit,
}: PdfUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chooseFile = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;

    if (
      selectedFile &&
      selectedFile.type !== "application/pdf" &&
      !selectedFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setFile(null);
      setError("Please choose a PDF file.");
      event.target.value = "";
      return;
    }

    setError("");
    setFile(selectedFile);
  };

  const uploadFile = async (selectedFile: File) => {
    const formData = new FormData();
    formData.append("file", selectedFile);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error || "Upload failed. Please try again.");
    }
  };

  const clearFile = () => {
    setFile(null);
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const submit = async () => {
    const message = value.trim();

    if ((!message && !file) || disabled || isUploading) return;

    setError("");
    setIsUploading(Boolean(file));

    try {
      const uploadedFileName = file?.name;

      if (file) {
        await uploadFile(file);
      }

      await onSubmit({
        message,
        fileName: uploadedFileName,
      });

      clearFile();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Upload failed. Please try again."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-2xl bg-[#2f2f2f] px-3 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.2)]">
        {file ? (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#3a3a3a] px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-gray-200" />
              <span className="truncate text-sm text-gray-100">{file.name}</span>
            </div>

            <button
              aria-label="Remove PDF"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-gray-300 transition hover:bg-white/10 hover:text-white"
              disabled={disabled || isUploading}
              onClick={clearFile}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <button
            aria-label="Attach PDF"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-gray-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={disabled || isUploading}
            onClick={chooseFile}
            type="button"
          >
            <Plus className="h-6 w-6" />
          </button>

          <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={file ? "Ask about this PDF..." : "Ask anything..."}
            className="min-h-10 flex-1 bg-transparent px-1 text-base text-white placeholder:text-gray-400 focus:outline-none"
            disabled={disabled || isUploading}
          />

          <button
            aria-label={isUploading ? "Uploading PDF" : "Send message"}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={disabled || isUploading || (!value.trim() && !file)}
            onClick={submit}
            type="button"
          >
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleFileChange}
        type="file"
      />

      {error ? <p className="mt-2 px-2 text-sm text-red-300">{error}</p> : null}
    </div>
  );
}

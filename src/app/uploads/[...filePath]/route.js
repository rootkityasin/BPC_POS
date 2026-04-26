import path from "node:path";
import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";

const CONTENT_TYPES = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

function buildUploadPath(segments) {
  if (!Array.isArray(segments) || segments.length === 0) {
    return null;
  }

  const normalizedSegments = segments.map((segment) => String(segment || "").trim()).filter(Boolean);
  if (normalizedSegments.length === 0) {
    return null;
  }

  if (normalizedSegments.some((segment) => segment === "." || segment === ".." || segment.includes("\\") || segment.includes("/"))) {
    return null;
  }

  return path.join(process.cwd(), "public", "uploads", ...normalizedSegments);
}

export async function GET(_, { params }) {
  const uploadPath = buildUploadPath(params?.filePath);
  if (!uploadPath) {
    return NextResponse.json({ error: "Invalid upload path" }, { status: 400 });
  }

  try {
    const fileBuffer = await readFile(uploadPath);
    const extension = path.extname(uploadPath).toLowerCase();

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": CONTENT_TYPES[extension] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}

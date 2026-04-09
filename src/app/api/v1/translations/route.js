import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const targetLanguage = String(searchParams.get("targetLanguage") || "bn");

  const rows = await prisma.translationCache.findMany({
    where: {
      sourceLanguage: "en",
      targetLanguage
    },
    select: {
      sourceText: true,
      translatedText: true
    }
  });

  return NextResponse.json({ translations: rows });
}

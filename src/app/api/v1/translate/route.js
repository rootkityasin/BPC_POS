import { NextResponse } from "next/server";
import { translateTexts } from "@/modules/i18n/libretranslate-service";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const texts = Array.isArray(body.texts) ? body.texts : [];
  const sourceLanguage = String(body.sourceLanguage || "en");
  const targetLanguage = String(body.targetLanguage || "bn");

  const translations = await translateTexts({ texts, sourceLanguage, targetLanguage });

  return NextResponse.json({ translations });
}

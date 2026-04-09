import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ success: true, data: { status: "ok" }, error: null, meta: { version: "0.1.0" } });
}

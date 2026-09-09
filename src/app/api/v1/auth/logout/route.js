import { NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, revokeCurrentSession, clearSessionCookies } from "@/modules/auth/session-service";
import { LANGUAGE_STORAGE_KEY } from "@/modules/i18n/constants";

export async function POST() {
  await revokeCurrentSession();
  await clearSessionCookies();
  const response = NextResponse.json({ success: true, data: null, error: null, meta: null });
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
  response.cookies.set(LANGUAGE_STORAGE_KEY, "bn", { path: "/", maxAge: 31536000, sameSite: "lax" });
  return response;
}

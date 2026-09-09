import { NextResponse } from "next/server";
import { buildRedirectUrl } from "@/lib/request-url";
import { loginWithPassword } from "@/modules/auth/auth-service";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  getAccessCookieOptions,
  getRefreshCookieOptions
} from "@/modules/auth/session-service";
import { LANGUAGE_STORAGE_KEY } from "@/modules/i18n/constants";

export async function POST(request) {
  const formData = await request.formData();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const result = await loginWithPassword(email, password);

  if (!result.success) {
    const response = NextResponse.redirect(buildRedirectUrl(request, `/login?error=${encodeURIComponent(result.error)}`), 303);
    response.cookies.delete(ACCESS_COOKIE);
    response.cookies.delete(REFRESH_COOKIE);
    return response;
  }

  const response = NextResponse.redirect(buildRedirectUrl(request, "/admin/pos?login=1"), 303);
  response.cookies.set(ACCESS_COOKIE, result.tokens.accessToken, getAccessCookieOptions());
  response.cookies.set(REFRESH_COOKIE, result.tokens.refreshToken, getRefreshCookieOptions());
  response.cookies.set(LANGUAGE_STORAGE_KEY, "bn", { path: "/", maxAge: 31536000, sameSite: "lax" });
  return response;
}

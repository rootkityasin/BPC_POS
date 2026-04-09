import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearSessionCookies,
  getAccessCookieOptions,
  getRefreshCookieOptions,
  refreshSession
} from "@/modules/auth/session-service";

export async function POST() {
  const user = await refreshSession();

  if (!user) {
    await clearSessionCookies();
    return NextResponse.json({ success: false, data: null, error: "Unable to refresh session", meta: null }, { status: 401 });
  }

  const response = NextResponse.json({ success: true, data: { userId: user.id }, error: null, meta: null });
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  if (accessToken) response.cookies.set(ACCESS_COOKIE, accessToken, getAccessCookieOptions());
  if (refreshToken) response.cookies.set(REFRESH_COOKIE, refreshToken, getRefreshCookieOptions());
  return response;
}

import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyRefreshToken, signAccessToken, signRefreshToken, verifyAccessToken } from "@/adapters/auth/token-service";
import { buildPermissionMap } from "@/core/policies/permission-policy";

export const ACCESS_COOKIE = "bpc_access_token";
export const REFRESH_COOKIE = "bpc_refresh_token";

export function getAccessCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 8 * 60 * 60
  };
}

export function getRefreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60
  };
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSessionForUser(user) {
  const permissionMap = buildPermissionMap(user.role.code, user.permissionOverrides);
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role.code,
    storeId: user.storeId,
    permissions: permissionMap
  };

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(payload),
    signRefreshToken({ sub: user.id })
  ]);

  const headerStore = await headers();
  await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: hashToken(refreshToken),
      userAgent: headerStore.get("user-agent") || undefined,
      ipAddress: headerStore.get("x-forwarded-for") || undefined,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  });

  return { accessToken, refreshToken };
}

export async function setSessionCookies(accessToken, refreshToken) {
  const cookieStore = await cookies();
  cookieStore.set(ACCESS_COOKIE, accessToken, getAccessCookieOptions());
  cookieStore.set(REFRESH_COOKIE, refreshToken, getRefreshCookieOptions());
}

export async function clearSessionCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  if (!accessToken) return null;

  try {
    const tokenPayload = await verifyAccessToken(accessToken);
    const user = await prisma.user.findUnique({
      where: { id: tokenPayload.sub },
      include: {
        role: true,
        permissionOverrides: true
      }
    });

    if (!user || !user.isActive) {
      return null;
    }

    return {
      ...tokenPayload,
      id: user.id,
      sub: user.id,
      email: user.email,
      role: user.role.code,
      storeId: user.storeId,
      permissions: buildPermissionMap(user.role.code, user.permissionOverrides)
    };
  } catch {
    return null;
  }
}

export async function refreshSession() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;

  const payload = await verifyRefreshToken(refreshToken);
  const session = await prisma.session.findFirst({
    where: {
      userId: payload.sub,
      refreshTokenHash: hashToken(refreshToken),
      status: "ACTIVE",
      expiresAt: { gt: new Date() }
    },
    include: {
      user: {
        include: {
          role: true,
          permissionOverrides: true
        }
      }
    }
  });

  if (!session) return null;
  const tokens = await createSessionForUser(session.user);
  await setSessionCookies(tokens.accessToken, tokens.refreshToken);
  return session.user;
}

export async function revokeCurrentSession() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return;

  await prisma.session.updateMany({
    where: { refreshTokenHash: hashToken(refreshToken) },
    data: { status: "REVOKED" }
  });
}

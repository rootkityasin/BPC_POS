import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/modules/auth/session-service";

const ACTIVE_STORE_COOKIE = "activeStoreId";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

async function resolveValidStoreId(storeId) {
  const normalizedStoreId = String(storeId || "").trim();
  if (!normalizedStoreId) return null;

  const store = await prisma.store.findUnique({
    where: { id: normalizedStoreId },
    select: { id: true }
  });

  return store?.id || null;
}

/**
 * GET /api/v1/auth/active-store
 * Returns the currently active store ID for SUPER_ADMIN.
 * Store managers always use their assigned storeId.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Store managers cannot switch stores - they always use their assigned store
  if (user.role !== "SUPER_ADMIN") {
    return NextResponse.json({
      activeStoreId: user.storeId || null,
      canSwitchStore: false
    });
  }

  // SUPER_ADMIN: read from cookie
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(ACTIVE_STORE_COOKIE)?.value || null;
  const activeStoreId = await resolveValidStoreId(cookieValue);

  if (cookieValue && !activeStoreId) {
    cookieStore.delete(ACTIVE_STORE_COOKIE);
  }

  return NextResponse.json({
    activeStoreId,
    canSwitchStore: true
  });
}

/**
 * POST /api/v1/auth/active-store
 * Sets the active store ID for SUPER_ADMIN only.
 * Store managers are forbidden from changing their active store.
 */
export async function POST(request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only SUPER_ADMIN can switch stores
  if (user.role !== "SUPER_ADMIN") {
    return NextResponse.json({
      error: "Forbidden: Store managers cannot switch stores",
      activeStoreId: user.storeId
    }, { status: 403 });
  }

  const body = await request.json();
  const requestedStoreId = String(body.storeId || "").trim();

  const cookieStore = await cookies();

  if (requestedStoreId) {
    const validatedStoreId = await resolveValidStoreId(requestedStoreId);
    if (!validatedStoreId) {
      return NextResponse.json({
        error: "Store not found",
        activeStoreId: null
      }, { status: 400 });
    }

    cookieStore.set(ACTIVE_STORE_COOKIE, validatedStoreId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE
    });
  } else {
    // Clear the cookie if storeId is null/empty
    cookieStore.delete(ACTIVE_STORE_COOKIE);
  }

  return NextResponse.json({
    success: true,
    activeStoreId: requestedStoreId || null
  });
}

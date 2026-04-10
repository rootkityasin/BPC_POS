import { cookies } from "next/headers";

const ACTIVE_STORE_COOKIE = "activeStoreId";

/**
 * Resolves the effective store ID for the current user.
 *
 * - Store managers (STORE_MANAGER): ALWAYS returns their assigned storeId.
 *   They cannot switch stores or view other stores' data.
 * - SUPER_ADMIN: Returns the store selected via the store selector (cookie),
 *   or null if no store is selected (meaning they see all stores' data).
 *
 * @param {object} user - The session user object
 * @returns {Promise<string|null>} The store ID to scope queries to, or null for unscoped access
 */
export async function getActiveStoreId(user) {
  // Store managers are ALWAYS locked to their own store
  if (user.storeId && user.role !== "SUPER_ADMIN") {
    return user.storeId;
  }

  // SUPER_ADMIN can select a store via cookie, or see all stores if none selected
  if (user.role === "SUPER_ADMIN") {
    const cookieStore = await cookies();
    const activeStoreId = cookieStore.get(ACTIVE_STORE_COOKIE)?.value;
    return activeStoreId || null;
  }

  return null;
}
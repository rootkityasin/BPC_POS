import { cookies } from "next/headers";
import { LANGUAGE_STORAGE_KEY } from "@/modules/i18n/constants";
import { AdminShell } from "@/components/layout/admin-shell";
import { requireAuthenticatedUser } from "@/modules/rbac/access";
import { listNotifications, unreadNotificationCount } from "@/modules/notifications/notification-service";
import { getActiveStoreId } from "@/modules/auth/active-store";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout({ children }) {
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get(LANGUAGE_STORAGE_KEY)?.value;
  const initialLanguage = cookieLang === "en" || cookieLang === "bn" ? cookieLang : "bn";
  const sessionUser = await requireAuthenticatedUser();
  const activeStoreId = await getActiveStoreId(sessionUser);
  const [unreadCount, initialNotifications] = await Promise.all([
    unreadNotificationCount(sessionUser, activeStoreId),
    listNotifications(sessionUser, 10, activeStoreId)
  ]);

  const stores = sessionUser.role === "SUPER_ADMIN"
    ? await prisma.store.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, nameEn: true, nameBn: true } })
    : [];

  return (
    <AdminShell sessionUser={sessionUser} unreadCount={unreadCount} initialNotifications={initialNotifications} stores={stores} activeStoreId={activeStoreId} initialLanguage={initialLanguage}>
      {children}
    </AdminShell>
  );
}

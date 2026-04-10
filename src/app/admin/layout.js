import { AdminShell } from "@/components/layout/admin-shell";
import { requireAuthenticatedUser } from "@/modules/rbac/access";
import { listNotifications, unreadNotificationCount } from "@/modules/notifications/notification-service";
import { getActiveStoreId } from "@/modules/auth/active-store";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout({ children }) {
  const sessionUser = await requireAuthenticatedUser();
  const activeStoreId = await getActiveStoreId(sessionUser);
  const [unreadCount, initialNotifications] = await Promise.all([
    unreadNotificationCount(sessionUser, activeStoreId),
    listNotifications(sessionUser, 10, activeStoreId)
  ]);

  const stores = sessionUser.role === "SUPER_ADMIN"
    ? await prisma.store.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, nameEn: true } })
    : [];

  return (
    <AdminShell sessionUser={sessionUser} unreadCount={unreadCount} initialNotifications={initialNotifications} stores={stores} activeStoreId={activeStoreId}>
      {children}
    </AdminShell>
  );
}

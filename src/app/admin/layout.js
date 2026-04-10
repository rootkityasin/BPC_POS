import { AdminShell } from "@/components/layout/admin-shell";
import { requireAuthenticatedUser } from "@/modules/rbac/access";
import { listNotifications, unreadNotificationCount } from "@/modules/notifications/notification-service";

export default async function AdminLayout({ children }) {
  const sessionUser = await requireAuthenticatedUser();
  const [unreadCount, initialNotifications] = await Promise.all([
    unreadNotificationCount(sessionUser),
    listNotifications(sessionUser, 10)
  ]);

  return (
    <AdminShell sessionUser={sessionUser} unreadCount={unreadCount} initialNotifications={initialNotifications}>
      {children}
    </AdminShell>
  );
}

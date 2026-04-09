import { AdminShell } from "@/components/layout/admin-shell";
import { requireAuthenticatedUser } from "@/modules/rbac/access";
import { unreadNotificationCount } from "@/modules/notifications/notification-service";

export default async function AdminLayout({ children }) {
  const sessionUser = await requireAuthenticatedUser();
  const unreadCount = await unreadNotificationCount(sessionUser);

  return (
    <AdminShell sessionUser={sessionUser} unreadCount={unreadCount}>
      {children}
    </AdminShell>
  );
}

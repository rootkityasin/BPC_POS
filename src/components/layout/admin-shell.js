import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminHeader } from "@/components/layout/admin-header";
import { AdminI18nProvider } from "@/components/providers/admin-i18n-provider";

export function AdminShell({ sessionUser, unreadCount, initialNotifications, stores, activeStoreId, children }) {
  return (
    <AdminI18nProvider>
      <div className="min-h-screen bg-slate-50">
        <AdminSidebar sessionUser={sessionUser} unreadCount={unreadCount} activeStoreId={activeStoreId} />
        <div className="ml-72 min-h-screen">
          <AdminHeader sessionUser={sessionUser} unreadCount={unreadCount} initialNotifications={initialNotifications} stores={stores} activeStoreId={activeStoreId} />
          <main className="p-8">{children}</main>
        </div>
      </div>
    </AdminI18nProvider>
  );
}

import { Card } from "@/components/ui/card";
import { I18nText } from "@/components/i18n/i18n-text";
import { FEATURE_KEYS } from "@/core/policies/permission-policy";
import { requireFeatureView } from "@/modules/rbac/access";
import { listNotifications, unreadNotificationCount } from "@/modules/notifications/notification-service";
import { formatDistanceToNow } from "date-fns";

export const dynamic = "force-dynamic";

function severityClasses(severity) {
  if (severity === "CRITICAL") return "bg-rose-50 text-rose-700";
  if (severity === "WARNING") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

export default async function NotificationsPage() {
  const user = await requireFeatureView(FEATURE_KEYS.NOTIFICATIONS);
  const [notifications, unreadCount] = await Promise.all([
    listNotifications(user, 50),
    unreadNotificationCount(user)
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900"><I18nText k="notificationsPage.title" fallback="Notifications" /></h2>
        <p className="text-sm text-slate-500"><I18nText k="notificationsPage.subtitle" fallback="Live notification history scoped by role and store." /></p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Unread</div>
          <div className="mt-3 text-3xl font-black text-slate-900">{unreadCount}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total</div>
          <div className="mt-3 text-3xl font-black text-slate-900">{notifications.length}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Critical</div>
          <div className="mt-3 text-3xl font-black text-slate-900">{notifications.filter((item) => item.severity === "CRITICAL").length}</div>
        </Card>
      </div>

      <div className="space-y-4">
        {notifications.map((notification) => (
          <Card key={notification.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="font-bold text-slate-900">{notification.title}</div>
                  {!notification.read ? <span className="rounded-full bg-[#ff242d] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">New</span> : null}
                </div>
                <p className="mt-2 text-sm text-slate-600">{notification.message}</p>
              </div>
              <div className="text-right text-xs text-slate-400">
                <div className={`inline-flex rounded-full px-3 py-1 font-semibold ${severityClasses(notification.severity)}`}>{notification.severity}</div>
                <div className="mt-2">{notification.type}</div>
                <div><I18nText k="notificationsPage.ago" fallback="{{time}} ago" values={{ time: formatDistanceToNow(notification.createdAt) }} /></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

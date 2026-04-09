import { Card } from "@/components/ui/card";
import { FEATURE_KEYS } from "@/core/policies/permission-policy";
import { requireFeatureView } from "@/modules/rbac/access";
import { listNotifications } from "@/modules/notifications/notification-service";
import { formatDistanceToNow } from "date-fns";

export default async function NotificationsPage() {
  const user = await requireFeatureView(FEATURE_KEYS.NOTIFICATIONS);
  const notifications = await listNotifications(user, 50);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-black text-slate-900">Notifications</h2>
        <p className="text-sm text-slate-500">Live notification history scoped by role and store.</p>
      </div>
      {notifications.map((notification) => (
        <Card key={notification.id} className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-bold text-slate-900">{notification.title}</div>
              <p className="mt-2 text-sm text-slate-600">{notification.message}</p>
            </div>
            <div className="text-right text-xs text-slate-400">
              <div>{notification.severity}</div>
              <div>{formatDistanceToNow(notification.createdAt)} ago</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

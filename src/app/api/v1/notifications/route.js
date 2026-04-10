import { NextResponse } from "next/server";
import { getSessionUser } from "@/modules/auth/session-service";
import { listNotifications, markAllNotificationsRead, markNotificationRead, unreadNotificationCount } from "@/modules/notifications/notification-service";
import { getActiveStoreId } from "@/modules/auth/active-store";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, data: null, error: "Unauthorized", meta: null }, { status: 401 });
  }

  const storeId = await getActiveStoreId(user);
  const [items, unreadCount] = await Promise.all([
    listNotifications(user, 20, storeId),
    unreadNotificationCount(user, storeId)
  ]);

  return NextResponse.json({ success: true, data: items, error: null, meta: { unreadCount } });
}

export async function PATCH(request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, data: null, error: "Unauthorized", meta: null }, { status: 401 });
  }

  const storeId = await getActiveStoreId(user);
  const body = await request.json().catch(() => ({}));

  if (body.all) {
    await markAllNotificationsRead(user, storeId);
  } else if (body.notificationId) {
    await markNotificationRead(user, String(body.notificationId), storeId);
  } else {
    return NextResponse.json({ success: false, data: null, error: "Invalid payload", meta: null }, { status: 400 });
  }

  const [items, unreadCount] = await Promise.all([
    listNotifications(user, 20, storeId),
    unreadNotificationCount(user, storeId)
  ]);

  return NextResponse.json({ success: true, data: items, error: null, meta: { unreadCount } });
}

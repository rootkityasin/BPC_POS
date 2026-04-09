import { NextResponse } from "next/server";
import { getSessionUser } from "@/modules/auth/session-service";
import { listNotifications, unreadNotificationCount } from "@/modules/notifications/notification-service";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, data: null, error: "Unauthorized", meta: null }, { status: 401 });
  }

  const [items, unreadCount] = await Promise.all([
    listNotifications(user, 20),
    unreadNotificationCount(user)
  ]);

  return NextResponse.json({ success: true, data: items, error: null, meta: { unreadCount } });
}

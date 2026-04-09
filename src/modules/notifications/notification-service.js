import { prisma } from "@/lib/prisma";

export async function listNotifications(user, limit = 20) {
  const where = user.role === "SUPER_ADMIN"
    ? { OR: [{ audience: "SUPER_ADMIN" }, { storeId: user.storeId }] }
    : { storeId: user.storeId };

  return prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit
  });
}

export async function unreadNotificationCount(user) {
  const where = user.role === "SUPER_ADMIN"
    ? { OR: [{ audience: "SUPER_ADMIN" }, { storeId: user.storeId }], read: false }
    : { storeId: user.storeId, read: false };

  return prisma.notification.count({ where });
}

export async function createNotification(data) {
  return prisma.notification.create({ data });
}

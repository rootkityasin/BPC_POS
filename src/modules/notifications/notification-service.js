import { prisma } from "@/lib/prisma";

export const NOTIFICATION_AUDIENCES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  STORE: "STORE",
  USER: "USER"
};

function buildNotificationWhere(user) {
  const clauses = [];

  if (user.role === "SUPER_ADMIN") {
    clauses.push({ audience: NOTIFICATION_AUDIENCES.SUPER_ADMIN });
  }

  if (user.storeId) {
    clauses.push({ audience: NOTIFICATION_AUDIENCES.STORE, storeId: user.storeId });
  }

  clauses.push({ audience: NOTIFICATION_AUDIENCES.USER, userId: user.sub });

  return clauses.length === 1 ? clauses[0] : { OR: clauses };
}

export async function listNotifications(user, limit = 20) {
  return prisma.notification.findMany({
    where: buildNotificationWhere(user),
    orderBy: { createdAt: "desc" },
    take: limit
  });
}

export async function unreadNotificationCount(user) {
  return prisma.notification.count({
    where: {
      ...buildNotificationWhere(user),
      read: false
    }
  });
}

export async function markAllNotificationsRead(user) {
  return prisma.notification.updateMany({
    where: {
      ...buildNotificationWhere(user),
      read: false
    },
    data: { read: true }
  });
}

export async function markNotificationRead(user, notificationId) {
  return prisma.notification.updateMany({
    where: {
      id: notificationId,
      read: false,
      ...buildNotificationWhere(user)
    },
    data: { read: true }
  });
}

export async function createNotification(data) {
  return prisma.notification.create({ data });
}

async function createAudienceNotifications(notifications) {
  if (notifications.length === 0) return;
  await prisma.notification.createMany({ data: notifications });
}

export async function emitNotificationEvent(eventName, payload) {
  switch (eventName) {
    case "order.created": {
      await createAudienceNotifications([
        {
          storeId: payload.storeId,
          title: "New order placed",
          message: `${payload.invoiceNumber} was placed${payload.customerName ? ` for ${payload.customerName}` : ""} with a total of ${payload.totalAmount}.`,
          type: "ORDER_CREATED",
          severity: "INFO",
          audience: NOTIFICATION_AUDIENCES.STORE
        }
      ]);
      return;
    }
    case "store.updated": {
      await createAudienceNotifications([
        {
          storeId: payload.storeId,
          title: payload.created ? "New store created" : "Store settings updated",
          message: payload.created
            ? `${payload.storeName} is ready for manager assignment and setup.`
            : `${payload.storeName} details were updated by ${payload.actorName || "an administrator"}.`,
          type: "SYNC_ALERT",
          severity: "INFO",
          audience: NOTIFICATION_AUDIENCES.STORE
        },
        {
          title: payload.created ? "Store created" : "Store updated",
          message: payload.created
            ? `${payload.storeName} was added to the multi-store workspace.`
            : `${payload.storeName} settings were updated by ${payload.actorName || "an administrator"}.`,
          type: "SYNC_ALERT",
          severity: "INFO",
          audience: NOTIFICATION_AUDIENCES.SUPER_ADMIN
        }
      ]);
      return;
    }
    case "device.settings.updated": {
      await createAudienceNotifications([
        {
          storeId: payload.storeId,
          title: "Device settings changed",
          message: `${payload.storeName} receipt or printer settings were updated by ${payload.actorName || "a manager"}.`,
          type: "DEVICE_ALERT",
          severity: "WARNING",
          audience: NOTIFICATION_AUDIENCES.STORE
        },
        {
          title: "Device configuration updated",
          message: `${payload.storeName} updated receipt editor or printer configuration.`,
          type: "DEVICE_ALERT",
          severity: "WARNING",
          audience: NOTIFICATION_AUDIENCES.SUPER_ADMIN
        }
      ]);
      return;
    }
    case "manager.permissions.updated": {
      await createAudienceNotifications([
        {
          title: "Manager permissions updated",
          message: `${payload.managerName} permission overrides were updated by ${payload.actorName || "an administrator"}.`,
          type: "SECURITY_ALERT",
          severity: "WARNING",
          audience: NOTIFICATION_AUDIENCES.SUPER_ADMIN
        }
      ]);
      return;
    }
    case "manager.status.updated": {
      await createAudienceNotifications([
        {
          title: payload.isActive ? "Manager activated" : "Manager deactivated",
          message: `${payload.managerName} was ${payload.isActive ? "activated" : "deactivated"} by ${payload.actorName || "an administrator"}.`,
          type: "SECURITY_ALERT",
          severity: payload.isActive ? "INFO" : "CRITICAL",
          audience: NOTIFICATION_AUDIENCES.SUPER_ADMIN
        }
      ]);
      return;
    }
    case "manager.password.reset": {
      await createAudienceNotifications([
        {
          title: "Manager password reset",
          message: `${payload.managerName} password was reset by ${payload.actorName || "an administrator"}.`,
          type: "SECURITY_ALERT",
          severity: "CRITICAL",
          audience: NOTIFICATION_AUDIENCES.SUPER_ADMIN
        }
      ]);
      return;
    }
    case "auth.lockout": {
      await createAudienceNotifications([
        {
          title: "Account locked after failed sign-ins",
          message: `${payload.email} was locked after repeated failed sign-in attempts.`,
          type: "SECURITY_ALERT",
          severity: "CRITICAL",
          audience: NOTIFICATION_AUDIENCES.SUPER_ADMIN
        }
      ]);
      return;
    }
    default:
      return;
  }
}

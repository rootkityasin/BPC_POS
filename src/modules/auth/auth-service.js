import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/adapters/auth/password-service";
import { emitNotificationEvent } from "@/modules/notifications/notification-service";
import { createSessionForUser } from "@/modules/auth/session-service";

const LOCKOUT_LIMIT = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export async function loginWithPassword(email, password) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      role: true,
      permissionOverrides: true
    }
  });

  if (!user) {
    return { success: false, error: "Invalid credentials" };
  }

  if (!user.isActive) {
    return { success: false, error: "Account is inactive" };
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { success: false, error: "Account temporarily locked" };
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    const failedCount = user.failedLoginAttempts + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: failedCount,
        lockedUntil: failedCount >= LOCKOUT_LIMIT ? new Date(Date.now() + LOCKOUT_MS) : null
      }
    });

    if (failedCount >= LOCKOUT_LIMIT) {
      await emitNotificationEvent("auth.lockout", {
        email: user.email
      });
    }

    return { success: false, error: failedCount >= LOCKOUT_LIMIT ? "Account locked after too many attempts" : "Invalid credentials" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null
    }
  });

  const tokens = await createSessionForUser(user);
  return { success: true, user, tokens };
}

export async function verifyManagerOrAdminAuthorization(email, password) {
  if (!email || !password) {
    return { success: false, error: "Manager/Admin email and password are required" };
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      email: {
        equals: normalizedEmail,
        mode: "insensitive"
      }
    },
    include: {
      role: true,
      permissionOverrides: true
    }
  });

  if (!user) {
    return { success: false, error: "Manager or Admin account not found" };
  }

  if (!user.isActive) {
    return { success: false, error: "Manager/Admin account is inactive" };
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { success: false, error: "Manager/Admin account is temporarily locked" };
  }

  const roleCode = user.role?.code;
  if (roleCode !== "SUPER_ADMIN" && roleCode !== "MANAGER") {
    return { success: false, error: "Authorization failed: account is not a Manager or Super Admin" };
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return { success: false, error: "Invalid password for authorizing manager/admin" };
  }

  return {
    success: true,
    authorizedBy: user.name || user.email,
    authorizerId: user.id,
    role: roleCode
  };
}

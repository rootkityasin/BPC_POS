import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/adapters/auth/password-service";
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

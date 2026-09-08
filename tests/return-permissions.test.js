import { describe, expect, it } from "vitest";
import { buildPermissionMap, FEATURE_KEYS, canManage } from "../src/core/policies/permission-policy";

function isItemReturnDirectlyAllowed(roleCode, overrides = []) {
  if (roleCode === "SUPER_ADMIN") return true;
  const permissionMap = buildPermissionMap(roleCode, overrides);
  return canManage(permissionMap, FEATURE_KEYS.ORDERS);
}

function evaluateReturnAuthorization({ sessionRole, sessionOverrides = [], managerAuth = null, validManagers = [] }) {
  // 1. Direct permission check
  if (isItemReturnDirectlyAllowed(sessionRole, sessionOverrides)) {
    return { allowed: true, direct: true, authorizedBy: sessionRole };
  }

  // 2. Authorization credentials check
  if (!managerAuth || !managerAuth.email || !managerAuth.password) {
    return {
      allowed: false,
      direct: false,
      error: "Item return requires Manager or Super Admin permission. Please provide authorized manager credentials."
    };
  }

  const manager = validManagers.find(
    (m) => m.email.toLowerCase() === managerAuth.email.toLowerCase() && m.password === managerAuth.password
  );

  if (!manager) {
    return { allowed: false, direct: false, error: "Invalid password for authorizing manager/admin" };
  }

  if (manager.role !== "SUPER_ADMIN" && manager.role !== "MANAGER") {
    return { allowed: false, direct: false, error: "Authorization failed: account is not a Manager or Super Admin" };
  }

  if (!manager.isActive) {
    return { allowed: false, direct: false, error: "Manager/Admin account is inactive" };
  }

  return { allowed: true, direct: false, authorizedBy: manager.name || manager.email, role: manager.role };
}

describe("Item Return & Order Refund Permission Enforcement", () => {
  describe("Direct Permission Resolution", () => {
    it("grants direct item return permission to SUPER_ADMIN", () => {
      expect(isItemReturnDirectlyAllowed("SUPER_ADMIN")).toBe(true);
    });

    it("grants direct item return permission to MANAGER by default", () => {
      const map = buildPermissionMap("MANAGER");
      expect(map[FEATURE_KEYS.ORDERS].canManage).toBe(true);
      expect(isItemReturnDirectlyAllowed("MANAGER")).toBe(true);
    });

    it("blocks direct item return if manager orders permission is explicitly overridden to false", () => {
      const overrides = [{ key: FEATURE_KEYS.ORDERS, canView: true, canManage: false }];
      expect(isItemReturnDirectlyAllowed("MANAGER", overrides)).toBe(false);
    });

    it("blocks direct item return for CASHIER or unprivileged role", () => {
      const overrides = [{ key: FEATURE_KEYS.ORDERS, canView: true, canManage: false }];
      expect(isItemReturnDirectlyAllowed("CASHIER", overrides)).toBe(false);
    });
  });

  describe("Manager/Admin Authorization Override Flow", () => {
    const validManagers = [
      { email: "admin@bpc.local", password: "password123", name: "Super Admin", role: "SUPER_ADMIN", isActive: true },
      { email: "manager@bpc.local", password: "managerpass", name: "Store Manager", role: "MANAGER", isActive: true },
      { email: "inactive@bpc.local", password: "pass", name: "Old Manager", role: "MANAGER", isActive: false },
      { email: "cashier@bpc.local", password: "cashierpass", name: "Cashier One", role: "CASHIER", isActive: true }
    ];

    it("allows authorized execution directly for SUPER_ADMIN without managerAuth", () => {
      const res = evaluateReturnAuthorization({ sessionRole: "SUPER_ADMIN", validManagers });
      expect(res.allowed).toBe(true);
      expect(res.direct).toBe(true);
    });

    it("allows authorized execution directly for MANAGER without managerAuth", () => {
      const res = evaluateReturnAuthorization({ sessionRole: "MANAGER", validManagers });
      expect(res.allowed).toBe(true);
      expect(res.direct).toBe(true);
    });

    it("rejects unauthorized user if managerAuth credentials are not provided", () => {
      const res = evaluateReturnAuthorization({
        sessionRole: "CASHIER",
        sessionOverrides: [{ key: FEATURE_KEYS.ORDERS, canManage: false }],
        managerAuth: null,
        validManagers
      });
      expect(res.allowed).toBe(false);
      expect(res.error).toContain("requires Manager or Super Admin permission");
    });

    it("successfully authorizes return when unauthorized user provides valid Manager credentials", () => {
      const res = evaluateReturnAuthorization({
        sessionRole: "CASHIER",
        sessionOverrides: [{ key: FEATURE_KEYS.ORDERS, canManage: false }],
        managerAuth: { email: "manager@bpc.local", password: "managerpass" },
        validManagers
      });
      expect(res.allowed).toBe(true);
      expect(res.direct).toBe(false);
      expect(res.authorizedBy).toBe("Store Manager");
      expect(res.role).toBe("MANAGER");
    });

    it("successfully authorizes return when unauthorized user provides valid Super Admin credentials", () => {
      const res = evaluateReturnAuthorization({
        sessionRole: "CASHIER",
        sessionOverrides: [{ key: FEATURE_KEYS.ORDERS, canManage: false }],
        managerAuth: { email: "admin@bpc.local", password: "password123" },
        validManagers
      });
      expect(res.allowed).toBe(true);
      expect(res.direct).toBe(false);
      expect(res.authorizedBy).toBe("Super Admin");
      expect(res.role).toBe("SUPER_ADMIN");
    });

    it("rejects when invalid credentials are provided", () => {
      const res = evaluateReturnAuthorization({
        sessionRole: "CASHIER",
        sessionOverrides: [{ key: FEATURE_KEYS.ORDERS, canManage: false }],
        managerAuth: { email: "manager@bpc.local", password: "wrongpassword" },
        validManagers
      });
      expect(res.allowed).toBe(false);
      expect(res.error).toContain("Invalid password");
    });

    it("rejects when non-manager account credentials are used for authorization", () => {
      const res = evaluateReturnAuthorization({
        sessionRole: "CASHIER",
        sessionOverrides: [{ key: FEATURE_KEYS.ORDERS, canManage: false }],
        managerAuth: { email: "cashier@bpc.local", password: "cashierpass" },
        validManagers
      });
      expect(res.allowed).toBe(false);
      expect(res.error).toContain("not a Manager or Super Admin");
    });

    it("rejects when inactive manager account is used", () => {
      const res = evaluateReturnAuthorization({
        sessionRole: "CASHIER",
        sessionOverrides: [{ key: FEATURE_KEYS.ORDERS, canManage: false }],
        managerAuth: { email: "inactive@bpc.local", password: "pass" },
        validManagers
      });
      expect(res.allowed).toBe(false);
      expect(res.error).toContain("inactive");
    });
  });
});

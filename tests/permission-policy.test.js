import { describe, expect, it } from "vitest";
import { buildPermissionMap, FEATURE_KEYS } from "../src/core/policies/permission-policy";

describe("permission policy", () => {
  it("grants all permissions to super admin", () => {
    const map = buildPermissionMap("SUPER_ADMIN");
    expect(map[FEATURE_KEYS.USERS].canView).toBe(true);
    expect(map[FEATURE_KEYS.USERS].canManage).toBe(true);
  });

  it("applies manager defaults and overrides", () => {
    const map = buildPermissionMap("MANAGER", [
      { key: FEATURE_KEYS.DISHES, canView: true, canManage: true }
    ]);
    expect(map[FEATURE_KEYS.CATEGORY].canManage).toBe(false);
    expect(map[FEATURE_KEYS.DISHES].canManage).toBe(true);
  });
});

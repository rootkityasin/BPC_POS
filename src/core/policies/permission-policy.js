export const FEATURE_KEYS = {
  POS: "POS",
  ORDERS: "ORDERS",
  STOCK: "STOCK",
  CATEGORY: "CATEGORY",
  SUBCATEGORY: "SUBCATEGORY",
  DISHES: "DISHES",
  DEVICE_SETTINGS: "DEVICE_SETTINGS",
  STORE_SETTINGS: "STORE_SETTINGS",
  USERS: "USERS",
  CUSTOMERS: "CUSTOMERS",
  REPORTS: "REPORTS",
  EXPENSES: "EXPENSES",
  NOTIFICATIONS: "NOTIFICATIONS"
};

const managerDefaults = {
  [FEATURE_KEYS.POS]: { canView: true, canManage: true },
  [FEATURE_KEYS.ORDERS]: { canView: true, canManage: true },
  [FEATURE_KEYS.STOCK]: { canView: true, canManage: true },
  [FEATURE_KEYS.CATEGORY]: { canView: true, canManage: false },
  [FEATURE_KEYS.SUBCATEGORY]: { canView: true, canManage: false },
  [FEATURE_KEYS.DISHES]: { canView: true, canManage: false },
  [FEATURE_KEYS.DEVICE_SETTINGS]: { canView: true, canManage: true },
  [FEATURE_KEYS.STORE_SETTINGS]: { canView: false, canManage: false },
  [FEATURE_KEYS.USERS]: { canView: false, canManage: false },
  [FEATURE_KEYS.CUSTOMERS]: { canView: false, canManage: false },
  [FEATURE_KEYS.REPORTS]: { canView: false, canManage: false },
  [FEATURE_KEYS.EXPENSES]: { canView: false, canManage: false },
  [FEATURE_KEYS.NOTIFICATIONS]: { canView: true, canManage: false }
};

export function buildPermissionMap(roleCode, overrides = []) {
  if (roleCode === "SUPER_ADMIN") {
    return Object.values(FEATURE_KEYS).reduce((acc, key) => {
      acc[key] = { canView: true, canManage: true };
      return acc;
    }, {});
  }

  const merged = { ...managerDefaults };
  for (const override of overrides) {
    merged[override.key] = {
      canView: Boolean(override.canView),
      canManage: Boolean(override.canManage)
    };
  }

  return merged;
}

export function canView(permissionMap, featureKey) {
  return Boolean(permissionMap?.[featureKey]?.canView);
}

export function canManage(permissionMap, featureKey) {
  return Boolean(permissionMap?.[featureKey]?.canManage);
}

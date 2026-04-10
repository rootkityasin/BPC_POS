import { prisma } from "@/lib/prisma";
import { FEATURE_KEYS, buildPermissionMap } from "@/core/policies/permission-policy";
import { requireFeatureView } from "@/modules/rbac/access";
import { RolesClient } from "./roles-client";

const permissionSections = [
  {
    title: "Operations",
    rows: [
      { label: "POS", labelKey: "sidebar.pos", viewField: "viewPos", manageField: "managePos", key: FEATURE_KEYS.POS },
      { label: "Orders", labelKey: "sidebar.orders", viewField: "viewOrders", manageField: "manageOrders", key: FEATURE_KEYS.ORDERS },
      { label: "Stock", labelKey: "sidebar.stock", viewField: "viewStock", manageField: "manageStock", key: FEATURE_KEYS.STOCK },
      { label: "Category", labelKey: "sidebar.category", viewField: "viewCategory", manageField: "manageCategory", key: FEATURE_KEYS.CATEGORY },
      { label: "Sub-Category", labelKey: "roles.subCategory", viewField: "viewSubCategory", manageField: "manageSubCategory", key: FEATURE_KEYS.SUBCATEGORY },
      { label: "Dishes", labelKey: "sidebar.dishes", viewField: "viewDishes", manageField: "manageDishes", key: FEATURE_KEYS.DISHES }
    ]
  },
  {
    title: "Configuration",
    rows: [
      { label: "Device Settings", labelKey: "sidebar.deviceSettings", viewField: "viewDeviceSettings", manageField: "manageDeviceSettings", key: FEATURE_KEYS.DEVICE_SETTINGS },
      { label: "Store Settings", labelKey: "sidebar.storeSettings", viewField: "viewStoreSettings", manageField: "manageStoreSettings", key: FEATURE_KEYS.STORE_SETTINGS },
      { label: "Notifications", labelKey: "sidebar.notifications", viewField: "viewNotifications", manageField: "manageNotifications", key: FEATURE_KEYS.NOTIFICATIONS }
    ]
  },
  {
    title: "Business Tools",
    rows: [
      { label: "Customer", labelKey: "sidebar.customers", viewField: "viewCustomers", manageField: "manageCustomers", key: FEATURE_KEYS.CUSTOMERS },
      { label: "Sales Report", labelKey: "sidebar.salesReport", viewField: "viewReports", manageField: "manageReports", key: FEATURE_KEYS.REPORTS },
      { label: "Expense Tracking", labelKey: "sidebar.expenseTracking", viewField: "viewExpenses", manageField: "manageExpenses", key: FEATURE_KEYS.EXPENSES },
      { label: "Manage Roles", labelKey: "sidebar.manageRoles", viewField: "viewUsers", manageField: "manageUsers", key: FEATURE_KEYS.USERS }
    ]
  }
];

export default async function RolesPage() {
  await requireFeatureView(FEATURE_KEYS.USERS);
  const managers = await prisma.user.findMany({
    where: { role: { code: "MANAGER" } },
    include: { role: true, permissionOverrides: true, store: true },
    orderBy: { createdAt: "desc" }
  });

  const managersWithPermissions = managers.map((manager) => {
    const permissionMap = buildPermissionMap(manager.role.code, manager.permissionOverrides);

    return {
      ...manager,
      permissionMap,
      enabledCount: Object.values(permissionMap).filter((value) => value?.canView || value?.canManage).length
    };
  });

  return (
    <RolesClient
      managers={managersWithPermissions}
      permissionSections={permissionSections}
      stats={{
        total: managers.length,
        assigned: managers.filter((manager) => manager.storeId).length,
        active: managers.filter((manager) => manager.isActive).length
      }}
    />
  );
}

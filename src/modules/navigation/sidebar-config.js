import {
  Bell,
  ClipboardList,
  Layers,
  Package,
  Settings,
  ShoppingBag,
  SquareTerminal,
  User,
  Users,
  Wallet,
  Wrench
} from "lucide-react";
import { FEATURE_KEYS } from "@/core/policies/permission-policy";

export const sidebarItems = [
  {
    label: "POS",
    labelKey: "sidebar.pos",
    href: "/admin/pos",
    icon: SquareTerminal,
    featureKey: FEATURE_KEYS.POS
  },
  {
    label: "Orders",
    labelKey: "sidebar.orders",
    href: "/admin/orders",
    icon: ShoppingBag,
    featureKey: FEATURE_KEYS.ORDERS
  },
  {
    label: "Inventory",
    labelKey: "sidebar.inventory",
    href: "/admin/inventory/stock",
    icon: ClipboardList,
    featureKey: FEATURE_KEYS.STOCK,
    children: [
      { label: "Stock", labelKey: "sidebar.stock", href: "/admin/inventory/stock", featureKey: FEATURE_KEYS.STOCK },
      { label: "Category", labelKey: "sidebar.category", href: "/admin/inventory/category", featureKey: FEATURE_KEYS.CATEGORY }
    ]
  },
  {
    label: "Dishes",
    labelKey: "sidebar.dishes",
    href: "/admin/dishes",
    icon: Package,
    featureKey: FEATURE_KEYS.DISHES
  },
  {
    label: "Settings",
    labelKey: "sidebar.settings",
    href: "/admin/settings/device",
    icon: Settings,
    featureKey: FEATURE_KEYS.DEVICE_SETTINGS,
    children: [
      { label: "Store Settings", labelKey: "sidebar.storeSettings", href: "/admin/settings/store", featureKey: FEATURE_KEYS.STORE_SETTINGS },
      { label: "Store Manager", href: "/admin/settings/store/manage", featureKey: FEATURE_KEYS.STORE_SETTINGS },
      { label: "Device Settings", labelKey: "sidebar.deviceSettings", href: "/admin/settings/device", featureKey: FEATURE_KEYS.DEVICE_SETTINGS }
    ]
  },
  {
    label: "User",
    labelKey: "sidebar.users",
    href: "/admin/user/roles",
    icon: Users,
    featureKey: FEATURE_KEYS.USERS,
    children: [
      { label: "Manage Roles", labelKey: "sidebar.manageRoles", href: "/admin/user/roles", featureKey: FEATURE_KEYS.USERS },
      { label: "Customer", labelKey: "sidebar.customers", href: "/admin/user/customer", featureKey: FEATURE_KEYS.CUSTOMERS }
    ]
  },
  {
    label: "Manage",
    labelKey: "sidebar.manage",
    href: "/admin/manage/sales-report",
    icon: Wallet,
    featureKey: FEATURE_KEYS.REPORTS,
    children: [
      { label: "Sales Report", labelKey: "sidebar.salesReport", href: "/admin/manage/sales-report", featureKey: FEATURE_KEYS.REPORTS },
      { label: "Expense Tracking", labelKey: "sidebar.expenseTracking", href: "/admin/manage/expense-tracking", featureKey: FEATURE_KEYS.EXPENSES }
    ]
  },
  {
    label: "Notifications",
    labelKey: "sidebar.notifications",
    href: "/admin/notifications",
    icon: Bell,
    featureKey: FEATURE_KEYS.NOTIFICATIONS
  }
];

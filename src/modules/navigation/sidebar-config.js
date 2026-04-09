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
    href: "/admin/pos",
    icon: SquareTerminal,
    featureKey: FEATURE_KEYS.POS
  },
  {
    label: "Orders",
    href: "/admin/orders",
    icon: ShoppingBag,
    featureKey: FEATURE_KEYS.ORDERS
  },
  {
    label: "Inventory",
    href: "/admin/inventory/stock",
    icon: ClipboardList,
    featureKey: FEATURE_KEYS.STOCK,
    children: [
      { label: "Stock", href: "/admin/inventory/stock", featureKey: FEATURE_KEYS.STOCK },
      { label: "Category", href: "/admin/inventory/category", featureKey: FEATURE_KEYS.CATEGORY },
      { label: "Sub-Category", href: "/admin/inventory/sub-category", featureKey: FEATURE_KEYS.SUBCATEGORY }
    ]
  },
  {
    label: "Dishes",
    href: "/admin/dishes",
    icon: Package,
    featureKey: FEATURE_KEYS.DISHES
  },
  {
    label: "Settings",
    href: "/admin/settings/device",
    icon: Settings,
    featureKey: FEATURE_KEYS.DEVICE_SETTINGS,
    children: [
      { label: "Store Settings", href: "/admin/settings/store", featureKey: FEATURE_KEYS.STORE_SETTINGS },
      { label: "Device Settings", href: "/admin/settings/device", featureKey: FEATURE_KEYS.DEVICE_SETTINGS }
    ]
  },
  {
    label: "User",
    href: "/admin/user/roles",
    icon: Users,
    featureKey: FEATURE_KEYS.USERS,
    children: [
      { label: "Manage Roles", href: "/admin/user/roles", featureKey: FEATURE_KEYS.USERS },
      { label: "Customer", href: "/admin/user/customer", featureKey: FEATURE_KEYS.CUSTOMERS }
    ]
  },
  {
    label: "Manage",
    href: "/admin/manage/sales-report",
    icon: Wallet,
    featureKey: FEATURE_KEYS.REPORTS,
    children: [
      { label: "Sales Report", href: "/admin/manage/sales-report", featureKey: FEATURE_KEYS.REPORTS },
      { label: "Expense Tracking", href: "/admin/manage/expense-tracking", featureKey: FEATURE_KEYS.EXPENSES }
    ]
  },
  {
    label: "Notifications",
    href: "/admin/notifications",
    icon: Bell,
    featureKey: FEATURE_KEYS.NOTIFICATIONS
  }
];

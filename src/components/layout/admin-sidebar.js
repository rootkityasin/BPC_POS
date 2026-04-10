"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { sidebarItems } from "@/modules/navigation/sidebar-config";
import { canView } from "@/core/policies/permission-policy";

function isRouteActive(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isVisible(item, permissions, role) {
  if (role === "SUPER_ADMIN") return true;
  if (!item.featureKey) return true;
  return canView(permissions, item.featureKey);
}

export function AdminSidebar({ sessionUser, unreadCount }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const visibleItems = useMemo(
    () => sidebarItems.filter((item) => isVisible(item, sessionUser.permissions, sessionUser.role)),
    [sessionUser.permissions, sessionUser.role]
  );
  const [openMenus, setOpenMenus] = useState({});

  function toggleMenu(href) {
    setOpenMenus((current) => {
      const isCurrentlyOpen = Boolean(current[href]);
      if (isCurrentlyOpen) {
        return {};
      }

      return { [href]: true };
    });
  }

  return (
    <aside className="fixed left-0 top-0 z-20 flex h-screen w-72 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
        <div>
          <div className="text-2xl font-black text-crab-red">BPC</div>
          <p className="text-xs text-slate-500">{t("sidebar.brandSubtitle")}</p>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{sessionUser.role === "SUPER_ADMIN" ? t("sidebar.superAdmin") : t("sidebar.manager")}</div>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-5">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const visibleChildren = item.children?.filter((child) => isVisible(child, sessionUser.permissions, sessionUser.role)) || [];
          const activeChild = visibleChildren
            .filter((child) => isRouteActive(pathname, child.href))
            .sort((left, right) => right.href.length - left.href.length)[0] || null;
          const hasActiveChild = Boolean(activeChild);
          const active = visibleChildren.length > 0
            ? hasActiveChild
            : isRouteActive(pathname, item.href);
          const isOpen = visibleChildren.length > 0 ? (openMenus[item.href] ?? hasActiveChild) : false;

          return (
            <div key={item.href} className="space-y-1">
              {visibleChildren.length > 0 ? (
                <button
                  type="button"
                  onClick={() => toggleMenu(item.href)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition-colors",
                    active ? "bg-crab-red text-white" : isOpen ? "bg-slate-50 text-slate-700" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon className={cn("h-4 w-4", active ? "text-white" : isOpen ? "text-slate-700" : "text-slate-400")} />
                    {item.labelKey ? t(item.labelKey) : item.label}
                  </span>
                  <ChevronRight className={cn("h-4 w-4 transition-transform", isOpen ? "rotate-90" : "", active ? "text-white" : isOpen ? "text-slate-700" : "text-slate-400")} />
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition-colors",
                    active ? "bg-crab-red text-white" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon className={cn("h-4 w-4", active ? "text-white" : "text-slate-400")} />
                    {item.labelKey ? t(item.labelKey) : item.label}
                  </span>
                  {item.label === "Notifications" && unreadCount > 0 ? (
                    <span className={cn("rounded-full px-2 py-0.5 text-xs", active ? "bg-white/20" : "bg-slate-100 text-slate-700")}>{unreadCount}</span>
                  ) : null}
                </Link>
              )}

              {visibleChildren.length > 0 && isOpen && (
                <div className="space-y-1 pl-6">
                  {visibleChildren.map((child) => {
                    const childActive = activeChild?.href === child.href;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "block rounded-xl px-4 py-2 text-sm transition-colors",
                          childActive ? "bg-red-50 text-crab-red" : "text-slate-500 hover:bg-slate-50"
                        )}
                      >
                        {child.labelKey ? t(child.labelKey) : child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

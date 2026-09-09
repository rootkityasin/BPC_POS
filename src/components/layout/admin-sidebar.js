"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ModalShell } from "@/components/ui/modal-shell";
import { cn } from "@/lib/utils";
import { sidebarItems } from "@/modules/navigation/sidebar-config";
import { canView } from "@/core/policies/permission-policy";

const STORE_REQUIRED_ROUTES = new Set([
  "/admin/pos",
  "/admin/settings/device",
  "/admin/settings/store"
]);

function isRouteActive(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isVisible(item, permissions, role) {
  if (role === "SUPER_ADMIN") return true;
  if (!item.featureKey) return true;
  return canView(permissions, item.featureKey);
}

export function AdminSidebar({ sessionUser, unreadCount, activeStoreId }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const visibleItems = useMemo(
    () => sidebarItems.filter((item) => isVisible(item, sessionUser.permissions, sessionUser.role)),
    [sessionUser.permissions, sessionUser.role]
  );

  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef(null);

  const [hoveredMenu, setHoveredMenu] = useState(null);
  const menuHoverTimeoutRef = useRef(null);

  const [openMenus, setOpenMenus] = useState({});
  const [storePromptTarget, setStorePromptTarget] = useState(null);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (menuHoverTimeoutRef.current) {
        clearTimeout(menuHoverTimeoutRef.current);
      }
    };
  }, []);

  function handleMouseEnter() {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  }

  function handleMouseLeave() {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    if (menuHoverTimeoutRef.current) {
      clearTimeout(menuHoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
      setHoveredMenu(null);
    }, 220);
  }

  function handleMenuHover(href) {
    if (menuHoverTimeoutRef.current) {
      clearTimeout(menuHoverTimeoutRef.current);
      menuHoverTimeoutRef.current = null;
    }
    setHoveredMenu(href);
  }

  function handleMenuLeave() {
    if (menuHoverTimeoutRef.current) {
      clearTimeout(menuHoverTimeoutRef.current);
    }
    menuHoverTimeoutRef.current = setTimeout(() => {
      setHoveredMenu(null);
    }, 220);
  }

  function needsStoreSelection(href) {
    return sessionUser.role === "SUPER_ADMIN" && !activeStoreId && STORE_REQUIRED_ROUTES.has(href);
  }

  function handleProtectedNavigation(event, href) {
    if (!needsStoreSelection(href)) return;
    event.preventDefault();
    setStorePromptTarget(href);
  }

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
    <>
      <ModalShell isOpen={Boolean(storePromptTarget)} maxWidthClass="max-w-md" onBackdropClick={() => setStorePromptTarget(null)}>
        <h3 className="text-xl font-bold text-slate-900">Select a Store First</h3>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          You are currently viewing <strong>All Stores</strong>. Choose a specific store from the top bar before opening this store-specific section.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => setStorePromptTarget(null)}
            className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
          >
            Close
          </button>
        </div>
      </ModalShell>

      {/* Hover-to-expand Sidebar */}
      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-slate-200 bg-white transition-[width,box-shadow] duration-[350ms] ease-[cubic-bezier(0.16,1,0.3,1)] select-none will-change-[width]",
          isHovered ? "w-72 shadow-2xl" : "w-20 shadow-xs"
        )}
      >
        {/* Header (Logo & Role) */}
        <div className="flex h-20 items-center border-b border-slate-200 px-3.5 overflow-hidden select-none">
          <Link
            href="/admin/pos"
            className="flex items-center min-w-0 flex-1 group/logo cursor-pointer focus:outline-none"
            title="Go to POS"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center transition-transform group-hover/logo:scale-105 active:scale-95">
              <img
                src="/images/bpc-logo.png"
                alt="BPC Logo"
                className="h-8 w-auto object-contain"
              />
            </div>
            <div
              className={cn(
                "overflow-hidden transition-all duration-[350ms] ease-[cubic-bezier(0.16,1,0.3,1)] whitespace-nowrap",
                isHovered
                  ? "max-w-[160px] opacity-100 translate-x-0 ml-2"
                  : "max-w-0 opacity-0 -translate-x-2 ml-0 pointer-events-none"
              )}
            >
              <div
                suppressHydrationWarning
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 group-hover/logo:bg-slate-200 transition-colors"
              >
                {sessionUser.role === "SUPER_ADMIN" ? t("sidebar.superAdmin") : t("sidebar.manager")}
              </div>
            </div>
          </Link>
        </div>

        {/* Breathable Navigation Items */}
        <nav className="flex-1 space-y-3.5 overflow-y-auto overflow-x-hidden px-3.5 pt-6 scrollbar-none">
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

            const isMenuHovered = hoveredMenu === item.href;
            const isMenuPinned = Boolean(openMenus[item.href]);
            const isOpen = visibleChildren.length > 0
              ? isMenuHovered || isMenuPinned || (hasActiveChild && !hoveredMenu)
              : false;

            const labelText = item.labelKey ? t(item.labelKey) : item.label;

            return (
              <div
                key={item.href}
                onMouseEnter={() => (visibleChildren.length > 0 ? handleMenuHover(item.href) : handleMenuHover(null))}
                onMouseLeave={visibleChildren.length > 0 ? handleMenuLeave : undefined}
                className="space-y-1 relative"
              >
                {visibleChildren.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!isHovered) {
                        setIsHovered(true);
                      }
                      toggleMenu(item.href);
                    }}
                    title={!isHovered ? labelText : undefined}
                    className={cn(
                      "group flex h-12 w-full items-center rounded-xl px-2.5 text-sm font-semibold transition-all duration-200 ease-out outline-none select-none",
                      active
                        ? "bg-[#2771cb] text-white shadow-xs"
                        : isOpen && isHovered
                        ? "bg-slate-100 text-slate-900 font-bold"
                        : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                    )}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                      <Icon
                        className={cn(
                          "h-5 w-5 transition-colors",
                          active
                            ? "text-white"
                            : isOpen && isHovered
                            ? "text-[#2771cb]"
                            : "text-slate-500 group-hover:text-slate-800"
                        )}
                      />
                    </div>
                    <div
                      className={cn(
                        "flex items-center justify-between min-w-0 flex-1 overflow-hidden transition-all duration-[350ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                        isHovered
                          ? "max-w-[190px] opacity-100 translate-x-0 ml-3"
                          : "max-w-0 opacity-0 -translate-x-2 ml-0 pointer-events-none"
                      )}
                    >
                      <span className="truncate text-left text-[14px] font-semibold whitespace-nowrap">
                        {labelText}
                      </span>
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform duration-[350ms] ease-[cubic-bezier(0.16,1,0.3,1)] ml-2",
                          isOpen ? "rotate-90" : "",
                          active ? "text-white" : "text-slate-400 group-hover:text-slate-600"
                        )}
                      />
                    </div>
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    onClick={(event) => handleProtectedNavigation(event, item.href)}
                    title={!isHovered ? labelText : undefined}
                    className={cn(
                      "group flex h-12 w-full items-center rounded-xl px-2.5 text-sm font-semibold transition-all duration-200 ease-out outline-none select-none",
                      active
                        ? "bg-[#2771cb] text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                    )}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                      <Icon className={cn("h-5 w-5 transition-colors", active ? "text-white" : "text-slate-500 group-hover:text-slate-800")} />
                    </div>
                    <div
                      className={cn(
                        "flex items-center justify-between min-w-0 flex-1 overflow-hidden transition-all duration-[350ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                        isHovered
                          ? "max-w-[190px] opacity-100 translate-x-0 ml-3"
                          : "max-w-0 opacity-0 -translate-x-2 ml-0 pointer-events-none"
                      )}
                    >
                      <span className="truncate text-left text-[14px] font-semibold whitespace-nowrap">
                        {labelText}
                      </span>
                      {item.label === "Notifications" && unreadCount > 0 && (
                        <span className={cn(
                          "ml-auto rounded-full px-2 py-0.5 text-xs font-bold shrink-0",
                          active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                        )}>
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </Link>
                )}

                {/* Submenu links with high-contrast card container & connecting rail */}
                {visibleChildren.length > 0 && (
                  <div
                    className={cn(
                      "submenu-accordion",
                      isHovered && isOpen && "is-open"
                    )}
                  >
                    <div className="overflow-hidden">
                      <div
                        className={cn(
                          "relative ml-4 mr-1 pl-3 pr-1 py-1 space-y-1 transition-transform duration-[380ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                          isHovered && isOpen ? "translate-y-0" : "-translate-y-1"
                        )}
                      >
                        {visibleChildren.map((child) => {
                          const childActive = activeChild?.href === child.href;
                          const childLabel = child.labelKey ? t(child.labelKey) : child.label;
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={(event) => handleProtectedNavigation(event, child.href)}
                              className={cn(
                                "group/sub relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] transition-all duration-200 ease-out select-none",
                                childActive
                                  ? "bg-white text-slate-900 font-bold shadow-xs border border-slate-200/80"
                                  : "text-slate-600 font-medium hover:text-slate-950 hover:bg-slate-100/60"
                              )}
                            >
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 shrink-0 rounded-full transition-all duration-200",
                                  childActive
                                    ? "bg-slate-900 ring-2 ring-slate-200"
                                    : "bg-slate-300 group-hover/sub:bg-slate-500"
                                )}
                              />
                              <span className="truncate">{childLabel}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

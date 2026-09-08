"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AdminLanguageSwitch } from "@/components/layout/admin-language-switch";
import { NotificationCenter } from "@/components/layout/notification-center";
import { StoreSelector } from "@/components/layout/store-selector";
import { useTranslation } from "react-i18next";

export function AdminHeader({ sessionUser, initialNotifications, unreadCount, stores, activeStoreId }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors on logout
    } finally {
      router.push("/login");
      router.refresh();
      setIsLoggingOut(false);
    }
  }

  return (
    <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-8">
      <div>
        <Link href="/admin/pos" className="hover:opacity-80 transition-opacity">
          <h1 className="text-xl font-bold text-slate-900 leading-none">{t("header.title")}</h1>
        </Link>
      </div>
      <div className="flex items-center gap-4">
        {sessionUser.role === "SUPER_ADMIN" && stores && stores.length > 0 ? (
          <StoreSelector stores={stores} activeStoreId={activeStoreId} />
        ) : null}
        <NotificationCenter initialItems={initialNotifications} initialUnreadCount={unreadCount} />
        <AdminLanguageSwitch />
        <div className="text-right">
          <div className="text-sm font-semibold text-slate-800 leading-none">{sessionUser.email}</div>
        </div>
        <Button variant="outline" type="button" onClick={handleLogout} disabled={isLoggingOut}>
          {isLoggingOut ? t("header.logout") : t("header.logout")}
        </Button>
      </div>
    </header>
  );
}

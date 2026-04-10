"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";

function formatTime(value) {
  return new Date(value).toLocaleString();
}

function severityClasses(severity) {
  if (severity === "CRITICAL") return "bg-rose-50 text-rose-700";
  if (severity === "WARNING") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

export function NotificationCenter({ initialItems = [], initialUnreadCount = 0 }) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState(initialItems);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [isLoading, setIsLoading] = useState(false);
  const rootRef = useRef(null);

  async function refreshNotifications() {
    const response = await fetch("/api/v1/notifications", { cache: "no-store" });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) return;
    setItems(payload.data || []);
    setUnreadCount(payload.meta?.unreadCount || 0);
  }

  async function markAllRead() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/v1/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true })
      });
      const payload = await response.json().catch(() => null);
      if (response.ok && payload?.success) {
        setItems(payload.data || []);
        setUnreadCount(payload.meta?.unreadCount || 0);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function markSingleRead(notificationId) {
    const target = items.find((item) => item.id === notificationId);
    if (!target || target.read) return;

    const response = await fetch("/api/v1/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId })
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) return;
    setItems(payload.data || []);
    setUnreadCount(payload.meta?.unreadCount || 0);
  }

  useEffect(() => {
    const handleClick = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    refreshNotifications();
    const interval = window.setInterval(refreshNotifications, 15000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[#ff242d] px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-[calc(100%+12px)] z-50 w-[380px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <div className="text-sm font-bold text-slate-900">Notifications</div>
              <div className="text-xs text-slate-500">Live alerts for system, security, and store activity</div>
            </div>
            <button
              type="button"
              onClick={markAllRead}
              disabled={isLoading || unreadCount === 0}
              className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto p-3">
            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                No notifications yet.
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => markSingleRead(item.id)}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors ${item.read ? "border-slate-200 bg-white" : "border-red-100 bg-red-50/50"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{item.title}</div>
                        <div className="mt-1 text-sm text-slate-600">{item.message}</div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${severityClasses(item.severity)}`}>
                        {item.severity}
                      </span>
                    </div>
                    <div className="mt-3 text-xs text-slate-400">{formatTime(item.createdAt)}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 px-5 py-4">
            <Link href="/admin/notifications" onClick={() => setIsOpen(false)} className="text-sm font-semibold text-[#ff242d] hover:text-[#ea1d26]">
              View all notifications
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

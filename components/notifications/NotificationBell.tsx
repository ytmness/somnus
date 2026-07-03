"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";

interface NotificationBellProps {
  isLoggedIn: boolean;
}

export function NotificationBell({ isLoggedIn }: NotificationBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data, refetch } = useNotifications(isLoggedIn);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!isLoggedIn) return null;

  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.data ?? [];

  const handleClick = async (id: string, linkUrl: string | null) => {
    await fetch(`/api/notifications/${id}/read`, {
      method: "PATCH",
      credentials: "include",
    });
    void refetch();
    setOpen(false);
    if (linkUrl) router.push(linkUrl);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative text-white/80 hover:text-white transition-colors p-1"
        aria-label="Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl bg-[#12121a] border border-white/15 shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="font-semibold text-sm">Notificaciones</span>
            <Link
              href="/notificaciones"
              className="text-xs text-white/60 hover:text-white"
              onClick={() => setOpen(false)}
            >
              Ver todas
            </Link>
          </div>

          {notifications.length === 0 ? (
            <p className="text-white/50 text-sm p-4 text-center">Sin notificaciones</p>
          ) : (
            <ul>
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => void handleClick(n.id, n.linkUrl)}
                    className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 ${
                      !n.readAt ? "bg-white/5" : ""
                    }`}
                  >
                    <p className="text-sm font-medium">{n.title}</p>
                    {n.body && (
                      <p className="text-xs text-white/50 mt-0.5 line-clamp-2">{n.body}</p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

function groupByDate(notifications: Notification[]) {
  const groups: Record<string, Notification[]> = {};
  for (const n of notifications) {
    const key = new Date(n.createdAt).toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    if (!groups[key]) groups[key] = [];
    groups[key].push(n);
  }
  return groups;
}

export default function NotificacionesPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await fetch("/api/notifications?limit=50", { credentials: "include" });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const json = await res.json();
      if (res.ok) setNotifications(json.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [router]);

  const handleRead = async (n: Notification) => {
    if (!n.readAt) {
      await fetch(`/api/notifications/${n.id}/read`, {
        method: "PATCH",
        credentials: "include",
      });
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === n.id ? { ...item, readAt: new Date().toISOString() } : item
        )
      );
    }
    if (n.linkUrl) router.push(n.linkUrl);
  };

  const handleReadAll = async () => {
    await fetch("/api/notifications/read-all", {
      method: "PATCH",
      credentials: "include",
    });
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }))
    );
  };

  const groups = groupByDate(notifications);

  return (
    <div className="min-h-screen somnus-bg-main text-white">
      <div className="relative">
        <SiteHeader eventsHref="/" />
      </div>

      <main className="somnus-page-under-header max-w-2xl mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Notificaciones</h1>
          {notifications.some((n) => !n.readAt) && (
            <button
              type="button"
              onClick={() => void handleReadAll()}
              className="text-sm text-white/60 hover:text-white"
            >
              Marcar todas como leídas
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <p className="text-center text-white/50 py-16">No tienes notificaciones.</p>
        ) : (
          <div className="space-y-8">
            {Object.entries(groups).map(([date, items]) => (
              <section key={date}>
                <h2 className="text-white/50 text-xs uppercase tracking-wider mb-3 capitalize">
                  {date}
                </h2>
                <ul className="somnus-card divide-y divide-white/10 overflow-hidden">
                  {items.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => void handleRead(n)}
                        className={`w-full text-left px-5 py-4 hover:bg-white/5 transition-colors ${
                          !n.readAt ? "bg-white/[0.03]" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {!n.readAt && (
                            <span className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                          )}
                          <div className={!n.readAt ? "" : "ml-5"}>
                            <p className="font-medium">{n.title}</p>
                            {n.body && (
                              <p className="text-white/60 text-sm mt-1">{n.body}</p>
                            )}
                            <p className="text-white/40 text-xs mt-2">
                              {new Date(n.createdAt).toLocaleTimeString("es-MX", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        <p className="mt-8 text-center">
          <Link href="/feed" className="text-white/60 hover:text-white text-sm underline">
            Ver tu feed de seguidos
          </Link>
        </p>
      </main>
    </div>
  );
}

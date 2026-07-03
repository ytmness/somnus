"use client";

import { useQuery } from "@tanstack/react-query";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

async function fetchNotifications() {
  const res = await fetch("/api/notifications?limit=10", { credentials: "include" });
  if (res.status === 401) return { data: [], unreadCount: 0 };
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json as { data: Notification[]; unreadCount: number };
}

export function useNotifications(enabled = true) {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    enabled,
    refetchInterval: 30_000,
  });
}

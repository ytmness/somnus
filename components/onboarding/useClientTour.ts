"use client";

import { useCallback, useEffect, useState } from "react";

type ClientTourUser = {
  id: string;
  role: string;
  clientTourSeen?: boolean;
} | null;

/**
 * Opens the home tour only for CLIENTE accounts that have not seen it yet.
 * Persistence is server-side (User.clientTourSeen), not localStorage.
 */
export function useClientTour(user: ClientTourUser, sessionReady: boolean) {
  const [open, setOpen] = useState(false);
  const [dismissedLocally, setDismissedLocally] = useState(false);

  useEffect(() => {
    if (!sessionReady || dismissedLocally) return;
    if (!user || user.role !== "CLIENTE") {
      setOpen(false);
      return;
    }
    setOpen(!user.clientTourSeen);
  }, [user, sessionReady, dismissedLocally]);

  const close = useCallback(async () => {
    setOpen(false);
    setDismissedLocally(true);
    try {
      await fetch("/api/user/client-tour", {
        method: "PATCH",
        credentials: "include",
      });
    } catch {
      /* ignore — local dismiss still prevents re-open this session */
    }
  }, []);

  return { open, close };
}

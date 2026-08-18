"use client";

import { useCallback, useEffect, useState } from "react";

export function useProductTour(storageKey: string) {
  const key = `somnus_tour_${storageKey}_seen`;
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(key);
      if (!seen) setOpen(true);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, [key]);

  const start = useCallback(() => setOpen(true), []);

  const close = useCallback(
    (markSeen = true) => {
      setOpen(false);
      if (markSeen) {
        try {
          localStorage.setItem(key, "1");
        } catch {
          /* ignore */
        }
      }
    },
    [key]
  );

  return { open, ready, start, close };
}

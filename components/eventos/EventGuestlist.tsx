"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Users } from "lucide-react";

interface GuestPerson {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface EventGuestlistProps {
  eventId: string;
}

export function EventGuestlist({ eventId }: EventGuestlistProps) {
  const [count, setCount] = useState(0);
  const [people, setPeople] = useState<GuestPerson[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/attendance`);
        const json = await res.json();
        if (cancelled || !res.ok) return;
        setCount(json.data?.count ?? 0);
        setPeople(json.data?.people ?? []);
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (!loaded || count === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-white font-semibold uppercase tracking-wider text-sm mb-3 flex items-center gap-2">
        <Users className="w-4 h-4 text-white/70" aria-hidden />
        Going · {count}
      </h2>
      <div className="flex items-center -space-x-2">
        {people.slice(0, 8).map((p) => (
          <div
            key={p.id}
            title={p.name}
            className="w-9 h-9 rounded-full border-2 border-[#0a0a12] bg-white/10 overflow-hidden relative"
          >
            {p.avatarUrl ? (
              <Image
                src={p.avatarUrl}
                alt={p.name}
                fill
                className="object-cover"
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white/70">
                {p.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        ))}
        {count > people.length && (
          <span className="ml-3 text-xs text-white/50 pl-2">
            +{count - Math.min(people.length, 8)} more
          </span>
        )}
      </div>
    </div>
  );
}

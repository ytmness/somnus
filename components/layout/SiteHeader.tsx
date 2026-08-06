"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { NotificationBell } from "@/components/notifications/NotificationBell";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  staffRoles?: string[];
}

interface SiteHeaderProps {
  onUserChange?: (user: SessionUser | null) => void;
  /** Events link: "#eventos" on home, "/" elsewhere */
  eventsHref?: string;
}

const navLinkClass =
  "somnus-nav-link text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white";

export function SiteHeader({ onUserChange, eventsHref = "#eventos" }: SiteHeaderProps) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const onUserChangeRef = useRef(onUserChange);
  onUserChangeRef.current = onUserChange;

  useEffect(() => {
    const loadSession = async () => {
      try {
        const res = await fetch("/api/auth/session", { credentials: "include" });
        const data = await res.json();
        const sessionUser = data.user ?? null;
        setUser(sessionUser);
        onUserChangeRef.current?.(sessionUser);
      } catch {
        setUser(null);
        onUserChangeRef.current?.(null);
      } finally {
        setLoading(false);
      }
    };
    void loadSession();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      setUser(null);
      onUserChangeRef.current?.(null);
      toast.success("Signed out");
      window.location.href = "/";
    } catch {
      toast.error("Could not sign out");
    }
  };

  const eventsIsAnchor = eventsHref.startsWith("#");

  return (
    <header className="absolute top-0 left-0 right-0 z-30 px-4 sm:px-6 lg:px-12 py-4 sm:py-5 flex items-center justify-between">
      <button
        type="button"
        onClick={() => router.push("/")}
        className="somnus-nav-link text-white/90 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white"
        aria-label="SOMNUS home"
        translate="no"
      >
        SOMNUS
      </button>

      <nav className="flex items-center gap-2 sm:gap-4 lg:gap-6" aria-label="Main">
        {eventsIsAnchor ? (
          <a href={eventsHref} className={navLinkClass}>
            Events
          </a>
        ) : (
          <button
            type="button"
            onClick={() => router.push(eventsHref)}
            className={navLinkClass}
          >
            Events
          </button>
        )}

        <Link
          href="/galeria"
          className={`${navLinkClass} hidden sm:inline`}
        >
          Gallery
        </Link>

        {!loading && user && (
          <>
            <Link
              href="/organizaciones"
              className={`${navLinkClass} hidden sm:inline`}
            >
              Orgs
            </Link>
            <Link
              href="/feed"
              className={`${navLinkClass} hidden md:inline`}
            >
              Feed
            </Link>
            <Link
              href="/mensajes"
              className={`${navLinkClass} hidden md:inline`}
            >
              Messages
            </Link>
            <NotificationBell isLoggedIn />
          </>
        )}

        {!loading && user?.role === "ADMIN" && (
          <Link href="/admin" className={navLinkClass}>
            Admin
          </Link>
        )}

        {!loading &&
          (user?.role === "ACCESOS" ||
            user?.role === "ADMIN" ||
            user?.staffRoles?.includes("ACCESOS")) && (
          <Link href="/accesos" className={navLinkClass}>
            Access
          </Link>
        )}

        {!loading && user?.staffRoles?.includes("VENDEDOR") && (
          <Link
            href="/vendedor"
            className={`${navLinkClass} hidden sm:inline`}
          >
            Seller
          </Link>
        )}

        {!loading && user?.staffRoles?.includes("SUPERVISOR") && (
          <Link
            href="/supervisor"
            className={`${navLinkClass} hidden sm:inline`}
          >
            Supervisor
          </Link>
        )}

        {!loading && user?.staffRoles?.includes("MESA_HOST") && (
          <Link
            href="/accesos"
            className={`${navLinkClass} hidden md:inline`}
          >
            My tables
          </Link>
        )}

        {!loading && user && (
          <>
            <Link href="/mis-boletos" className="somnus-nav-link text-white/90 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white">
              My Tickets
            </Link>
            <Link
              href="/organizador"
              className="somnus-nav-link text-white/60 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white hidden md:inline"
            >
              Publish events
            </Link>
          </>
        )}

        {!loading && (
          user ? (
            <>
              <span className="text-white/90 text-xs sm:text-sm font-medium px-2 py-1 uppercase tracking-wider hidden lg:inline truncate max-w-[10rem]">
                {user.name || user.email}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className={navLinkClass}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => router.push("/register")}
                className="somnus-nav-link text-white/90 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white border border-white/30 px-3 py-1.5 rounded-full hidden sm:inline"
              >
                Create account
              </button>
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="somnus-nav-link text-white/90 text-xs sm:text-sm font-medium px-2 py-1 uppercase tracking-wider hover:text-white"
              >
                Sign in
              </button>
            </>
          )
        )}
      </nav>
    </header>
  );
}

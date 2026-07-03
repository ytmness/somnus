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
  /** Enlace de eventos: "#eventos" en home, "/" en otras páginas */
  eventsHref?: string;
}

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
      toast.success("Sesión cerrada");
      window.location.href = "/";
    } catch {
      toast.error("Error al cerrar sesión");
    }
  };

  const eventsIsAnchor = eventsHref.startsWith("#");

  return (
    <header className="absolute top-0 left-0 right-0 z-30 px-4 sm:px-6 lg:px-12 py-4 sm:py-5 flex items-center justify-between">
      <button
        type="button"
        onClick={() => router.push("/")}
        className="text-white/90 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors"
        aria-label="SOMNUS"
      >
        SOMNUS
      </button>

      <nav className="flex items-center gap-2 sm:gap-4 lg:gap-6">
        {eventsIsAnchor ? (
          <a
            href={eventsHref}
            className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors"
          >
            Events
          </a>
        ) : (
          <button
            type="button"
            onClick={() => router.push(eventsHref)}
            className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors"
          >
            Events
          </button>
        )}

        <Link
          href="/galeria"
          className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors hidden sm:inline"
        >
          Gallery
        </Link>

        {!loading && user && (
          <>
            <Link
              href="/organizaciones"
              className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors hidden sm:inline"
            >
              Orgs
            </Link>
            <Link
              href="/feed"
              className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors hidden md:inline"
            >
              Feed
            </Link>
            <Link
              href="/mensajes"
              className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors hidden md:inline"
            >
              Mensajes
            </Link>
            <NotificationBell isLoggedIn />
          </>
        )}

        {!loading && user?.role === "ADMIN" && (
          <Link
            href="/admin"
            className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors"
          >
            Panel
          </Link>
        )}

        {!loading &&
          (user?.role === "ACCESOS" ||
            user?.role === "ADMIN" ||
            user?.staffRoles?.includes("ACCESOS")) && (
          <Link
            href="/accesos"
            className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors"
          >
            Access
          </Link>
        )}

        {!loading && user?.staffRoles?.includes("VENDEDOR") && (
          <Link
            href="/vendedor"
            className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors hidden sm:inline"
          >
            Vendedor
          </Link>
        )}

        {!loading && user?.staffRoles?.includes("SUPERVISOR") && (
          <Link
            href="/supervisor"
            className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors hidden sm:inline"
          >
            Supervisor
          </Link>
        )}

        {!loading && user?.staffRoles?.includes("MESA_HOST") && (
          <Link
            href="/accesos"
            className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors hidden md:inline"
          >
            Mis mesas
          </Link>
        )}

        {!loading && user && (
          <>
            <Link
              href="/mis-boletos"
              className="text-white/90 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors"
            >
              Mis Boletos
            </Link>
            <Link
              href="/organizador"
              className="text-white/60 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors hidden md:inline"
            >
              Publicar eventos
            </Link>
          </>
        )}

        {!loading && (
          user ? (
            <>
              <span className="text-white/90 text-xs sm:text-sm font-medium px-2 py-1 uppercase tracking-wider hidden lg:inline">
                {user.name || user.email}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors"
              >
                Salir
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => router.push("/register")}
                className="text-white/90 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors border border-white/30 px-3 py-1.5 rounded-full hidden sm:inline"
              >
                Crear cuenta
              </button>
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="text-white/90 text-xs sm:text-sm font-medium px-2 py-1 uppercase tracking-wider hover:text-white transition-colors"
              >
                Entrar
              </button>
            </>
          )
        )}
      </nav>
    </header>
  );
}

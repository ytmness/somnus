"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface SomnusHeaderProps {
  user?: any;
  userRole?: string | null;
  showNav?: boolean;
}

export function SomnusHeader({ user: userProp, userRole: userRoleProp, showNav = false }: SomnusHeaderProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(userProp ?? null);
  const [userRole, setUserRole] = useState<string | null>(userRoleProp ?? null);

  useEffect(() => {
    if (userProp !== undefined) setUser(userProp);
    if (userRoleProp !== undefined) setUserRole(userRoleProp);
  }, [userProp, userRoleProp]);

  useEffect(() => {
    if (userProp !== undefined && userRoleProp !== undefined) return;
    const loadSession = async () => {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        if (data.success && data.data?.user) {
          if (userProp === undefined) setUser(data.data.user);
          if (userRoleProp === undefined) setUserRole(data.data.user?.role ?? null);
        }
      } catch {
        // ignore
      }
    };
    loadSession();
  }, [userProp, userRoleProp]);

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

      {showNav && (
        <nav className="flex items-center gap-2 sm:gap-4 lg:gap-6">
          <button
            onClick={() => router.push("/")}
            className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors"
          >
            Eventos
          </button>
          <button
            onClick={() => router.push("/galeria")}
            className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors hidden sm:inline"
          >
            Galería
          </button>
          {userRole === "ADMIN" && (
            <button
              onClick={() => router.push("/admin")}
              className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors"
            >
              Admin
            </button>
          )}
          {(userRole === "ACCESOS" || userRole === "ADMIN") && (
            <button
              onClick={() => router.push("/accesos")}
              className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors hidden md:inline"
            >
              Accesos
            </button>
          )}
          <button
            onClick={() => router.push("/mis-boletos")}
            className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors hidden sm:inline"
          >
            Mis Boletos
          </button>
          <button
            onClick={() => router.push("/login")}
            className="text-white/90 text-xs sm:text-sm font-medium px-2 py-1"
          >
            {user?.name || user?.email || "Login"}
          </button>
        </nav>
      )}
    </header>
  );
}

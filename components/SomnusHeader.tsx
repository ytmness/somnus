"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface SomnusHeaderProps {
  user?: any;
  userRole?: string | null;
  showNav?: boolean;
}

const navLinkClass =
  "somnus-nav-link text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white";

export function SomnusHeader({ user: userProp, userRole: userRoleProp, showNav = false }: SomnusHeaderProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(userProp ?? null);
  const [userRole, setUserRole] = useState<string | null>(userRoleProp ?? null);
  const [staffRoles, setStaffRoles] = useState<string[]>([]);

  useEffect(() => {
    if (userProp !== undefined) setUser(userProp);
    if (userRoleProp !== undefined) setUserRole(userRoleProp);
    if (userProp?.staffRoles) setStaffRoles(userProp.staffRoles);
  }, [userProp, userRoleProp]);

  useEffect(() => {
    if (userProp !== undefined && userRoleProp !== undefined) return;
    const loadSession = async () => {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        if (data.user) {
          if (userProp === undefined) setUser(data.user);
          if (userRoleProp === undefined) setUserRole(data.user?.role ?? null);
          setStaffRoles(data.user?.staffRoles ?? []);
        }
      } catch {
        // ignore
      }
    };
    loadSession();
  }, [userProp, userRoleProp]);

  return (
    <header className="somnus-safe-header fixed top-0 left-0 right-0 z-30 px-4 sm:px-6 lg:px-12 flex items-center justify-between gap-3 bg-gradient-to-b from-[#0A0A0A]/95 via-[#0A0A0A]/70 to-transparent">
      <button
        type="button"
        onClick={() => router.push("/")}
        className="somnus-nav-link relative z-10 text-white/90 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white shrink-0 leading-none py-2"
        aria-label="SOMNUS home"
        translate="no"
      >
        SOMNUS
      </button>

      {showNav && (
        <nav className="flex items-center gap-2 sm:gap-4 lg:gap-6" aria-label="Main">
          <button
            type="button"
            onClick={() => router.push("/")}
            className={navLinkClass}
          >
            Events
          </button>
          <button
            type="button"
            onClick={() => router.push("/galeria")}
            className={`${navLinkClass} hidden sm:inline`}
          >
            Gallery
          </button>
          {userRole === "ADMIN" && (
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className={navLinkClass}
            >
              Admin
            </button>
          )}
          {(userRole === "ACCESOS" ||
            userRole === "ADMIN" ||
            staffRoles.includes("ACCESOS")) && (
            <button
              type="button"
              onClick={() => router.push("/accesos")}
              className={`${navLinkClass} hidden md:inline`}
            >
              Access
            </button>
          )}
          {staffRoles.includes("VENDEDOR") && (
            <button
              type="button"
              onClick={() => router.push("/vendedor")}
              className={`${navLinkClass} hidden md:inline`}
            >
              Seller
            </button>
          )}
          {staffRoles.includes("SUPERVISOR") && (
            <button
              type="button"
              onClick={() => router.push("/supervisor")}
              className={`${navLinkClass} hidden md:inline`}
            >
              Supervisor
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push("/mis-boletos")}
            className={`${navLinkClass} hidden sm:inline`}
          >
            My Tickets
          </button>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="somnus-nav-link text-white/90 text-xs sm:text-sm font-medium px-2 py-1 uppercase tracking-wider hover:text-white"
          >
            {user?.name || user?.email || "Sign in"}
          </button>
        </nav>
      )}
    </header>
  );
}

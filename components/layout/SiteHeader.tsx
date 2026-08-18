"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useCartOptional } from "@/components/cart/CartContext";
import { HeaderCartDrawer } from "@/components/cart/HeaderCartDrawer";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  staffRoles?: string[];
  clientTourSeen?: boolean;
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
  const cart = useCartOptional();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!profileOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!profileRef.current?.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [profileOpen]);

  const handleLogout = async () => {
    setProfileOpen(false);
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
  const displayName = user?.name?.trim() || user?.email || "Account";
  const cartCount = cart?.itemCount ?? 0;

  return (
    <>
      <header className="somnus-safe-header absolute top-0 left-0 right-0 z-30 px-4 sm:px-6 lg:px-12 py-4 sm:py-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="somnus-nav-link text-white/90 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white shrink-0"
          aria-label="SOMNUS home"
          translate="no"
        >
          SOMNUS
        </button>

        <nav
          className="flex items-center gap-2 sm:gap-3 lg:gap-5 min-w-0"
          aria-label="Main"
        >
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-5 min-w-0 overflow-x-auto scrollbar-none">
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

            <Link href="/galeria" className={`${navLinkClass} hidden sm:inline`}>
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
                <Link href="/feed" className={`${navLinkClass} hidden md:inline`}>
                  Feed
                </Link>
                <Link
                  href="/mensajes"
                  className={`${navLinkClass} hidden md:inline`}
                >
                  Messages
                </Link>
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
              <Link
                href="/organizador"
                className={`${navLinkClass} hidden md:inline text-white/60`}
              >
                Publish events
              </Link>
            )}
          </div>

          {/* Trailing cluster — cart, bell, profile at the edge */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 pl-2 sm:pl-3 ml-1 border-l border-white/15">
            {cart && (
              <button
                type="button"
                onClick={() => cart.toggleCart()}
                data-tour="client-cart"
                className="somnus-nav-link relative p-2 text-white/80 hover:text-white"
                aria-label={
                  cartCount > 0 ? `Cart, ${cartCount} items` : "Cart"
                }
              >
                <ShoppingBag className="w-5 h-5" aria-hidden />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-[#5B8DEF] text-[10px] font-semibold text-white flex items-center justify-center tabular-nums">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </button>
            )}

            {!loading && user && (
              <span data-tour="client-bell" className="inline-flex">
                <NotificationBell isLoggedIn />
              </span>
            )}

            {!loading &&
              (user ? (
                <div className="relative" ref={profileRef}>
                  <button
                    type="button"
                    onClick={() => setProfileOpen((v) => !v)}
                    data-tour="client-profile"
                    className="somnus-nav-link inline-flex items-center gap-1 max-w-[9rem] sm:max-w-[12rem] px-2.5 py-1.5 text-white/90 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white border border-white/25 rounded-full"
                    aria-expanded={profileOpen}
                    aria-haspopup="menu"
                    aria-label={`Profile menu for ${displayName}`}
                  >
                    <span className="truncate">{displayName}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 shrink-0 opacity-70 transition-transform ${
                        profileOpen ? "rotate-180" : ""
                      }`}
                      aria-hidden
                    />
                  </button>
                  {profileOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-white/10 bg-[#0A0A0A]/95 backdrop-blur-md shadow-xl py-1.5 z-50"
                    >
                      <Link
                        href="/perfil"
                        role="menuitem"
                        className="block px-4 py-2.5 text-xs uppercase tracking-wider text-white/80 hover:text-white hover:bg-white/5"
                        onClick={() => setProfileOpen(false)}
                      >
                        Profile
                      </Link>
                      <Link
                        href="/configuracion"
                        role="menuitem"
                        className="block px-4 py-2.5 text-xs uppercase tracking-wider text-white/80 hover:text-white hover:bg-white/5"
                        onClick={() => setProfileOpen(false)}
                      >
                        Settings
                      </Link>
                      <Link
                        href="/mis-boletos"
                        role="menuitem"
                        className="block px-4 py-2.5 text-xs uppercase tracking-wider text-white/80 hover:text-white hover:bg-white/5"
                        onClick={() => setProfileOpen(false)}
                      >
                        My tickets
                      </Link>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2.5 text-xs uppercase tracking-wider text-white/80 hover:text-white hover:bg-white/5"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
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
              ))}
          </div>
        </nav>
      </header>
      {cart && <HeaderCartDrawer />}
    </>
  );
}

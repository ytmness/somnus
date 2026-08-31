"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Menu, ShoppingBag, X } from "lucide-react";
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

type NavItem = {
  href: string;
  label: string;
  desktopClass?: string;
};

const navLinkClass =
  "somnus-nav-link text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white";

function buildNavItems(
  user: SessionUser | null,
  eventsHref: string
): NavItem[] {
  const items: NavItem[] = [
    { href: eventsHref, label: "Events" },
    { href: "/explorar", label: "Explorar" },
    { href: "/galeria", label: "Gallery" },
  ];

  if (user?.role === "ADMIN") {
    items.push(
      { href: "/organizaciones", label: "Orgs" },
      { href: "/feed", label: "Feed" },
      { href: "/mensajes", label: "Messages" },
      { href: "/organizador", label: "Publish events" },
      { href: "/admin", label: "Admin" }
    );
  }

  if (
    user?.role === "ACCESOS" ||
    user?.role === "ADMIN" ||
    user?.staffRoles?.includes("ACCESOS")
  ) {
    items.push({ href: "/accesos", label: "Access" });
  }

  if (user?.staffRoles?.includes("VENDEDOR")) {
    items.push({ href: "/vendedor", label: "Seller" });
  }

  if (user?.staffRoles?.includes("SUPERVISOR")) {
    items.push({ href: "/supervisor", label: "Supervisor" });
  }

  if (user?.staffRoles?.includes("MESA_HOST")) {
    items.push({ href: "/accesos", label: "My tables" });
  }

  return items;
}

export function SiteHeader({ onUserChange, eventsHref = "#eventos" }: SiteHeaderProps) {
  const router = useRouter();
  const cart = useCartOptional();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    setProfileOpen(false);
    setMenuOpen(false);
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

  const displayName = user?.name?.trim() || user?.email || "Account";
  const cartCount = cart?.itemCount ?? 0;
  const navItems = buildNavItems(user, eventsHref);

  const renderNavLink = (item: NavItem, onClick?: () => void) => {
    if (item.href.startsWith("#")) {
      return (
        <a key={item.label} href={item.href} className={navLinkClass} onClick={onClick}>
          {item.label}
        </a>
      );
    }
    return (
      <Link
        key={`${item.href}-${item.label}`}
        href={item.href}
        className={navLinkClass}
        onClick={onClick}
      >
        {item.label}
      </Link>
    );
  };

  return (
    <>
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

        <nav className="relative z-10 flex items-center gap-1.5 sm:gap-3 lg:gap-5 min-w-0 shrink" aria-label="Main">
          <div className="hidden lg:flex items-center gap-5 min-w-0">
            {navItems.map((item) => renderNavLink(item))}
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 lg:pl-3 lg:ml-1 lg:border-l lg:border-white/15">
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
                <div className="relative hidden sm:block" ref={profileRef}>
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
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="somnus-nav-link hidden sm:inline text-white/90 text-xs sm:text-sm font-medium px-2 py-1 uppercase tracking-wider hover:text-white"
                >
                  Sign in
                </button>
              ))}

            <button
              type="button"
              onClick={() => {
                setProfileOpen(false);
                setMenuOpen((v) => !v);
              }}
              className="somnus-nav-link lg:hidden p-2 text-white/85 hover:text-white"
              aria-expanded={menuOpen}
              aria-controls="somnus-mobile-nav"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? (
                <X className="w-5 h-5" aria-hidden />
              ) : (
                <Menu className="w-5 h-5" aria-hidden />
              )}
            </button>
          </div>
        </nav>
      </header>

      {menuOpen && (
        <div
          id="somnus-mobile-nav"
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div className="somnus-mobile-nav-sheet absolute left-4 right-4 overflow-y-auto rounded-2xl border border-white/12 bg-[#0A0A0A]/92 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <nav className="flex flex-col p-2" aria-label="Mobile">
              {navItems.map((item) => (
                <div key={`${item.href}-${item.label}`}>
                  {item.href.startsWith("#") ? (
                    <a
                      href={item.href}
                      className="block rounded-xl px-4 py-3.5 text-sm uppercase tracking-wider text-white/85 hover:text-white hover:bg-white/5"
                      onClick={() => setMenuOpen(false)}
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link
                      href={item.href}
                      className="block rounded-xl px-4 py-3.5 text-sm uppercase tracking-wider text-white/85 hover:text-white hover:bg-white/5"
                      onClick={() => setMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  )}
                </div>
              ))}

              <div className="my-2 mx-4 border-t border-white/10" />

              {user ? (
                <>
                  <Link
                    href="/perfil"
                    className="block rounded-xl px-4 py-3.5 text-sm uppercase tracking-wider text-white/85 hover:text-white hover:bg-white/5"
                    onClick={() => setMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    href="/configuracion"
                    className="block rounded-xl px-4 py-3.5 text-sm uppercase tracking-wider text-white/85 hover:text-white hover:bg-white/5"
                    onClick={() => setMenuOpen(false)}
                  >
                    Settings
                  </Link>
                  <Link
                    href="/mis-boletos"
                    className="block rounded-xl px-4 py-3.5 text-sm uppercase tracking-wider text-white/85 hover:text-white hover:bg-white/5"
                    onClick={() => setMenuOpen(false)}
                  >
                    My tickets
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left rounded-xl px-4 py-3.5 text-sm uppercase tracking-wider text-white/85 hover:text-white hover:bg-white/5"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="block rounded-xl px-4 py-3.5 text-sm uppercase tracking-wider text-white/85 hover:text-white hover:bg-white/5"
                    onClick={() => setMenuOpen(false)}
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    className="block rounded-xl px-4 py-3.5 text-sm uppercase tracking-wider text-white hover:bg-white/5"
                    onClick={() => setMenuOpen(false)}
                  >
                    Create account
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      )}

      {cart && <HeaderCartDrawer />}
    </>
  );
}

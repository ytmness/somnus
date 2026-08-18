"use client";

import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  MapPin,
  Building2,
  UserCog,
  ImageIcon,
  Link2,
  Mail,
  TrendingUp,
  Percent,
  Database,
  X,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react";

export type AdminSection =
  | "overview"
  | "eventos"
  | "organizadores"
  | "equipo"
  | "venues"
  | "galeria"
  | "invites"
  | "aprobaciones"
  | "contacto"
  | "comisiones"
  | "ingresos"
  | "sql";

type NavItem = {
  id: AdminSection;
  label: string;
  icon: LucideIcon;
  danger?: boolean;
};

type NavGroup = {
  id: string;
  label: string | null;
  items: NavItem[];
};

export const ADMIN_NAV: NavGroup[] = [
  {
    id: "home",
    label: null,
    items: [{ id: "overview", label: "Overview", icon: LayoutDashboard }],
  },
  {
    id: "events",
    label: "Events",
    items: [
      { id: "eventos", label: "Events", icon: Calendar },
      { id: "venues", label: "Venues", icon: MapPin },
    ],
  },
  {
    id: "people",
    label: "People",
    items: [
      { id: "organizadores", label: "Organizers", icon: Building2 },
      { id: "equipo", label: "Team", icon: UserCog },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    items: [
      { id: "galeria", label: "Gallery", icon: ImageIcon },
      { id: "invites", label: "Table invites", icon: Link2 },
      { id: "aprobaciones", label: "Approvals", icon: ClipboardCheck },
      { id: "contacto", label: "Contact", icon: Mail },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    items: [
      { id: "ingresos", label: "Revenue", icon: TrendingUp },
      { id: "comisiones", label: "Commissions", icon: Percent },
    ],
  },
  {
    id: "advanced",
    label: "Advanced",
    items: [
      { id: "sql", label: "SQL Editor", icon: Database, danger: true },
    ],
  },
];

export const ADMIN_SECTION_META: Record<
  AdminSection,
  { title: string; description: string }
> = {
  overview: {
    title: "Overview",
    description: "Platform pulse and items that need your attention.",
  },
  eventos: {
    title: "Events",
    description: "Create, publish, feature, and manage all events.",
  },
  venues: {
    title: "Venues",
    description: "Reusable venues and addresses for event creation.",
  },
  organizadores: {
    title: "Organizers",
    description: "Marketplace organizers, Stripe status, and their events.",
  },
  equipo: {
    title: "Team",
    description: "Staff roles for scanning, selling, and supervision.",
  },
  galeria: {
    title: "Gallery",
    description:
      "Sections sort with the newest on top on the public page. Upload files or add by URL.",
  },
  invites: {
    title: "Table invites",
    description:
      "Generate per-seat payment links from event, table, total price, and guest count.",
  },
  aprobaciones: {
    title: "Pending approvals",
    description:
      "Review each buyer’s profile and approve to capture payment — or reject without charging.",
  },
  contacto: {
    title: "Contact",
    description: "People who submitted the contact form on the homepage.",
  },
  ingresos: {
    title: "Revenue",
    description:
      "Somnus earnings from configured commission and service fees, by event and organizer.",
  },
  comisiones: {
    title: "Commissions",
    description:
      "Configure global, per-organizer, or per-event rates. Resolution: event → organizer → global.",
  },
  sql: {
    title: "SQL Editor",
    description: "Raw database queries. Use with care — changes are immediate.",
  },
};

interface AdminSidebarProps {
  activeSection: AdminSection;
  onSelect: (section: AdminSection) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

function NavList({
  activeSection,
  onSelect,
  markForTour,
}: {
  activeSection: AdminSection;
  onSelect: (section: AdminSection) => void;
  markForTour?: boolean;
}) {
  return (
    <nav
      className="space-y-5"
      data-tour={markForTour ? "admin-sidebar" : undefined}
      aria-label="Admin sections"
    >
      {ADMIN_NAV.map((group) => (
        <div key={group.id}>
          {group.label && (
            <p className="px-3 mb-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-white/40">
              {group.label}
            </p>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors text-left ${
                      active
                        ? item.danger
                          ? "bg-amber-500/15 text-amber-200 border border-amber-500/30"
                          : "bg-white text-black"
                        : item.danger
                          ? "text-amber-200/70 hover:text-amber-100 hover:bg-amber-500/10"
                          : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" aria-hidden />
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AdminSidebar({
  activeSection,
  onSelect,
  mobileOpen,
  onMobileClose,
}: AdminSidebarProps) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const handleSelect = (section: AdminSection) => {
    onSelect(section);
    onMobileClose();
  };

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="liquid-glass rounded-2xl p-4 sticky top-24">
          <NavList
            activeSection={activeSection}
            onSelect={handleSelect}
            markForTour={isDesktop}
          />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[80] flex lg:hidden"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close menu"
            onClick={onMobileClose}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation"
            className="relative w-[min(18rem,85vw)] h-full bg-[#0A0A0A] border-r border-white/10 overflow-y-auto shadow-2xl p-4 pt-5"
          >
            <div className="flex items-center justify-between mb-5">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/50">
                Menu
              </p>
              <button
                type="button"
                onClick={onMobileClose}
                className="somnus-nav-link p-2 text-white/70 hover:text-white"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" aria-hidden />
              </button>
            </div>
            <NavList
              activeSection={activeSection}
              onSelect={handleSelect}
              markForTour={!isDesktop}
            />
          </div>
        </div>
      )}
    </>
  );
}

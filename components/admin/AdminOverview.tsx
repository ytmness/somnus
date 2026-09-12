"use client";

import {
  Calendar,
  Ticket,
  Users,
  TrendingUp,
  AlertTriangle,
  Building2,
  Mail,
  Plus,
  MapPin,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatEventCalendarDate } from "@/lib/utils";
import type { AdminSection } from "./AdminSidebar";

export interface AdminEventSold {
  id: string;
  name: string;
  eventDate: string;
  sold: number;
  used: number;
  capacity: number;
}

export interface AdminStats {
  totalEvents: number;
  ticketsSold: number;
  ticketsSoldMonth: number;
  ticketsUsed: number;
  activeUsers: number;
  platformCommissionMonth: number;
  salesCompletedMonth: number;
  organizersPendingStripe: number;
  newContactLeads: number;
  soldByEvent: AdminEventSold[];
}

interface AdminOverviewProps {
  stats: AdminStats | null;
  onNavigate: (section: AdminSection) => void;
  onCreateEvent: () => void;
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
}) {
  return (
    <div className="liquid-glass p-3.5 sm:p-5 rounded-2xl h-full flex flex-col min-w-0">
      <div className="flex items-start justify-between gap-2 min-h-0">
        <p className="text-white/70 text-xs sm:text-sm leading-snug pt-0.5 min-w-0 break-words">
          {label}
        </p>
        <div className="w-8 h-8 sm:w-11 sm:h-11 liquid-glass rounded-xl flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" aria-hidden />
        </div>
      </div>
      <p className="mt-2 sm:mt-3 text-xl sm:text-3xl font-bold leading-none tabular-nums text-white min-h-[1.5rem] sm:min-h-[2.25rem] flex items-end">
        {value}
      </p>
      {hint ? (
        <p className="mt-1.5 text-[11px] sm:text-xs text-white/45 tabular-nums">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function AdminOverview({
  stats,
  onNavigate,
  onCreateEvent,
}: AdminOverviewProps) {
  const pendingStripe = stats?.organizersPendingStripe ?? 0;
  const newLeads = stats?.newContactLeads ?? 0;
  const hasAttention = pendingStripe > 0 || newLeads > 0;

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div
        className="grid grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4 items-stretch"
        data-tour="admin-stats"
      >
        <StatCard
          label="Total events"
          value={
            stats !== null ? stats.totalEvents.toLocaleString("es-MX") : "—"
          }
          icon={Calendar}
        />
        <StatCard
          label="Tickets sold"
          value={
            stats !== null ? stats.ticketsSold.toLocaleString("es-MX") : "—"
          }
          hint={
            stats !== null
              ? `${(stats.ticketsSoldMonth ?? 0).toLocaleString("es-MX")} this month · ${(stats.ticketsUsed ?? 0).toLocaleString("es-MX")} used`
              : undefined
          }
          icon={Ticket}
        />
        <StatCard
          label="Active users"
          value={
            stats !== null ? stats.activeUsers.toLocaleString("es-MX") : "—"
          }
          icon={Users}
        />
        <StatCard
          label="Commission this month"
          value={
            stats !== null
              ? formatMoney(stats.platformCommissionMonth)
              : "—"
          }
          icon={TrendingUp}
        />
        <StatCard
          label="Sales this month"
          value={
            stats !== null
              ? stats.salesCompletedMonth.toLocaleString("es-MX")
              : "—"
          }
          hint={
            stats !== null
              ? `${(stats.ticketsSoldMonth ?? 0).toLocaleString("es-MX")} tickets`
              : undefined
          }
          icon={Ticket}
        />
      </div>

      {stats !== null && (stats.soldByEvent?.length ?? 0) > 0 && (
        <section>
          <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-white/60 mb-3">
            Sold by event
          </h2>
          <p className="text-white/45 text-xs sm:text-sm mb-3">
            Used tickets still count as sold.
          </p>
          <ul className="space-y-2">
            {stats.soldByEvent.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => onNavigate("eventos")}
                  className="w-full liquid-glass rounded-2xl px-4 py-3 text-left hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 min-w-0">
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">
                        {event.name}
                      </p>
                      <p className="text-white/45 text-xs mt-0.5">
                        {formatEventCalendarDate(event.eventDate)}
                        {event.used > 0
                          ? ` · ${event.used.toLocaleString("es-MX")} scanned`
                          : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-bold tabular-nums text-white leading-none">
                        {event.sold.toLocaleString("es-MX")}
                      </p>
                      <p className="text-[11px] text-white/45 mt-1 tabular-nums">
                        sold
                        {event.capacity > 0
                          ? ` / ${event.capacity.toLocaleString("es-MX")}`
                          : ""}
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Needs attention */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-amber-300" aria-hidden />
          <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-white/60">
            Needs attention
          </h2>
        </div>

        {!hasAttention && stats !== null ? (
          <div className="liquid-glass rounded-2xl p-5 text-white/60 text-sm">
            Nothing pending right now. Organizers have Stripe ready and no new
            contact requests in the last 7 days.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => onNavigate("organizadores")}
              className="liquid-glass rounded-2xl p-5 text-left hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="w-4 h-4 text-[#7BA3E8]" aria-hidden />
                    <p className="text-white font-medium">Stripe pending</p>
                  </div>
                  <p className="text-white/55 text-sm">
                    Active organizers who cannot charge yet.
                  </p>
                </div>
                <p className="text-2xl font-bold text-white tabular-nums">
                  {stats !== null ? pendingStripe : "—"}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate("contacto")}
              className="liquid-glass rounded-2xl p-5 text-left hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="w-4 h-4 text-[#7BA3E8]" aria-hidden />
                    <p className="text-white font-medium">New contact leads</p>
                  </div>
                  <p className="text-white/55 text-sm">
                    Homepage form submissions from the last 7 days.
                  </p>
                </div>
                <p className="text-2xl font-bold text-white tabular-nums">
                  {stats !== null ? newLeads : "—"}
                </p>
              </div>
            </button>
          </div>
        )}
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-white/60 mb-3">
          Quick actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={onCreateEvent}
            data-tour="admin-new-event"
          >
            <Plus className="w-4 h-4" aria-hidden />
            New event
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onNavigate("venues")}
            className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
          >
            <MapPin className="w-4 h-4 mr-2" aria-hidden />
            Add venue
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onNavigate("equipo")}
            className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
          >
            <UserPlus className="w-4 h-4 mr-2" aria-hidden />
            Invite staff
          </Button>
        </div>
      </section>
    </div>
  );
}

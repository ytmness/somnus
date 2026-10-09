"use client";

import { useState } from "react";
import { Calendar, MapPin, Users, CalendarClock, Coins, Route } from "lucide-react";
import { ExpandablePill } from "../ExpandablePill";
import {
  EVENT_FORM_CURRENCIES,
  EVENT_FORM_TIMEZONES,
  type EventFormCurrency,
  type EventFormData,
} from "../types";

type OpenPill = "when" | "location" | "sales" | "currency" | "tour" | null;

interface EventWhenWhereProps {
  data: EventFormData;
  onChange: (patch: Partial<EventFormData>) => void;
}

function formatDateTime(date: string, time: string): string {
  if (!date) return "";
  try {
    const d = new Date(`${date}T${time || "00:00"}`);
    const datePart = d.toLocaleDateString("es-MX", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    return time ? `${datePart} · ${time}` : datePart;
  } catch {
    return date;
  }
}

export function EventWhenWhere({ data, onChange }: EventWhenWhereProps) {
  const [open, setOpen] = useState<OpenPill>(null);
  const toggle = (pill: OpenPill) =>
    setOpen((current) => (current === pill ? null : pill));

  const whenValue = (() => {
    const start = formatDateTime(data.eventDate, data.eventTime);
    if (!start) return "";
    if (data.endDate || data.endTime) {
      const end = formatDateTime(data.endDate || data.eventDate, data.endTime);
      return end ? `${start} → ${end}` : start;
    }
    return start;
  })();

  const locationValue = [data.venue, data.city].filter(Boolean).join(" · ");

  return (
    <div className="space-y-2.5" id="section-when">
      <ExpandablePill
        icon={Calendar}
        label="Fecha"
        valueText={whenValue}
        placeholder="Elige fecha y hora"
        hasValue={Boolean(data.eventDate)}
        isOpen={open === "when"}
        onToggle={() => toggle("when")}
      >
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="event-date"
                className="block text-[11px] uppercase tracking-wider text-white/45 mb-1.5"
              >
                Fecha de inicio *
              </label>
              <input
                id="event-date"
                type="date"
                value={data.eventDate}
                onChange={(e) => onChange({ eventDate: e.target.value })}
                className="somnus-input !py-2.5 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="event-time"
                className="block text-[11px] uppercase tracking-wider text-white/45 mb-1.5"
              >
                Hora de inicio *
              </label>
              <input
                id="event-time"
                type="time"
                value={data.eventTime}
                onChange={(e) => onChange({ eventTime: e.target.value })}
                className="somnus-input !py-2.5 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="event-end-date"
                className="block text-[11px] uppercase tracking-wider text-white/45 mb-1.5"
              >
                Fecha de fin
              </label>
              <input
                id="event-end-date"
                type="date"
                value={data.endDate}
                onChange={(e) => onChange({ endDate: e.target.value })}
                className="somnus-input !py-2.5 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="event-end-time"
                className="block text-[11px] uppercase tracking-wider text-white/45 mb-1.5"
              >
                Hora de fin
              </label>
              <input
                id="event-end-time"
                type="time"
                value={data.endTime}
                onChange={(e) => onChange({ endTime: e.target.value })}
                className="somnus-input !py-2.5 text-sm"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="event-timezone"
              className="block text-[11px] uppercase tracking-wider text-white/45 mb-1.5"
            >
              Zona horaria
            </label>
            <select
              id="event-timezone"
              value={data.timezone}
              onChange={(e) => onChange({ timezone: e.target.value })}
              className="somnus-input !py-2.5 text-sm"
            >
              {EVENT_FORM_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </option>
              ))}
              {!EVENT_FORM_TIMEZONES.includes(
                data.timezone as (typeof EVENT_FORM_TIMEZONES)[number]
              ) &&
                data.timezone && (
                  <option value={data.timezone}>{data.timezone}</option>
                )}
            </select>
          </div>
        </div>
      </ExpandablePill>

      <ExpandablePill
        icon={MapPin}
        label="Lugar"
        valueText={locationValue}
        placeholder="Lugar"
        hasValue={Boolean(data.venue)}
        isOpen={open === "location"}
        onToggle={() => toggle("location")}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div>
            <label
              htmlFor="event-venue"
              className="block text-[11px] uppercase tracking-wider text-white/45 mb-1.5"
            >
              Venue *
            </label>
            <input
              id="event-venue"
              type="text"
              value={data.venue}
              onChange={(e) => onChange({ venue: e.target.value })}
              className="somnus-input !py-2.5 text-sm"
              placeholder="Nombre del venue"
            />
          </div>
          <div>
            <label
              htmlFor="event-city"
              className="block text-[11px] uppercase tracking-wider text-white/45 mb-1.5"
            >
              Ciudad
            </label>
            <input
              id="event-city"
              type="text"
              value={data.city}
              onChange={(e) => onChange({ city: e.target.value })}
              className="somnus-input !py-2.5 text-sm"
              placeholder="Monterrey"
            />
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="event-address"
              className="block text-[11px] uppercase tracking-wider text-white/45 mb-1.5"
            >
              Dirección (opcional)
            </label>
            <input
              id="event-address"
              type="text"
              value={data.address}
              onChange={(e) => onChange({ address: e.target.value })}
              className="somnus-input !py-2.5 text-sm"
              placeholder="Calle, colonia"
            />
          </div>
        </div>
      </ExpandablePill>

      <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3.5">
        <Users className="h-4 w-4 shrink-0 text-white/55" aria-hidden />
        <span className="sr-only">Cupo</span>
        <input
          id="event-capacity"
          type="number"
          min={1}
          value={data.maxCapacity || ""}
          onChange={(e) =>
            onChange({ maxCapacity: parseInt(e.target.value, 10) || 0 })
          }
          className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/45"
          placeholder="Cupo"
        />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <ExpandablePill
          appearance="chip"
          icon={CalendarClock}
          label="Ventas"
          valueText=""
          placeholder=""
          hasValue={Boolean(data.salesStartDate && data.salesEndDate)}
          isOpen={open === "sales"}
          onToggle={() => toggle("sales")}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="sales-start"
                className="mb-1.5 block text-[11px] uppercase tracking-wider text-white/45"
              >
                Inicio de ventas *
              </label>
              <input
                id="sales-start"
                type="datetime-local"
                value={data.salesStartDate}
                onChange={(e) => onChange({ salesStartDate: e.target.value })}
                className="somnus-input !py-2.5 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="sales-end"
                className="mb-1.5 block text-[11px] uppercase tracking-wider text-white/45"
              >
                Fin de ventas *
              </label>
              <input
                id="sales-end"
                type="datetime-local"
                value={data.salesEndDate}
                onChange={(e) => onChange({ salesEndDate: e.target.value })}
                className="somnus-input !py-2.5 text-sm"
              />
            </div>
          </div>
        </ExpandablePill>

        <ExpandablePill
          appearance="chip"
          icon={Coins}
          label="Moneda"
          valueText={data.currency}
          placeholder=""
          hasValue={Boolean(data.currency)}
          isOpen={open === "currency"}
          onToggle={() => toggle("currency")}
        >
          <select
            id="event-currency"
            value={data.currency}
            onChange={(e) =>
              onChange({ currency: e.target.value as EventFormCurrency })
            }
            className="somnus-input !py-2.5 text-sm"
            style={{ colorScheme: "dark" }}
          >
            {EVENT_FORM_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </ExpandablePill>

        <ExpandablePill
          appearance="chip"
          icon={Route}
          label="Tour"
          valueText={data.tour}
          placeholder=""
          hasValue={Boolean(data.tour.trim())}
          isOpen={open === "tour"}
          onToggle={() => toggle("tour")}
        >
          <input
            id="event-tour"
            type="text"
            value={data.tour}
            onChange={(e) => onChange({ tour: e.target.value })}
            className="somnus-input !py-2.5 text-sm"
            placeholder="Nombre del tour"
            autoComplete="off"
          />
        </ExpandablePill>
      </div>
    </div>
  );
}

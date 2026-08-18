"use client";

import { useState } from "react";
import { Calendar, MapPin, Users, CalendarClock } from "lucide-react";
import { ExpandablePill } from "../ExpandablePill";
import type { EventFormData } from "../types";

type OpenPill = "when" | "location" | "capacity" | "sales" | null;

interface EventWhenWhereProps {
  data: EventFormData;
  onChange: (patch: Partial<EventFormData>) => void;
}

function formatDateTime(date: string, time: string): string {
  if (!date) return "";
  try {
    const d = new Date(`${date}T${time || "00:00"}`);
    const datePart = d.toLocaleDateString("en-US", {
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

  return (
    <div className="space-y-2.5" id="section-when">
      <ExpandablePill
        icon={Calendar}
        label="Date & time"
        valueText={formatDateTime(data.eventDate, data.eventTime)}
        placeholder="Set date & time"
        hasValue={Boolean(data.eventDate)}
        isOpen={open === "when"}
        onToggle={() => toggle("when")}
      >
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div>
            <label htmlFor="event-date" className="block text-[11px] uppercase tracking-wider text-white/45 mb-1.5">
              Date *
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
            <label htmlFor="event-time" className="block text-[11px] uppercase tracking-wider text-white/45 mb-1.5">
              Time *
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
      </ExpandablePill>

      <ExpandablePill
        icon={MapPin}
        label="Location"
        valueText={data.venue}
        placeholder="Set venue & address"
        hasValue={Boolean(data.venue)}
        isOpen={open === "location"}
        onToggle={() => toggle("location")}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div>
            <label htmlFor="event-venue" className="block text-[11px] uppercase tracking-wider text-white/45 mb-1.5">
              Venue *
            </label>
            <input
              id="event-venue"
              type="text"
              value={data.venue}
              onChange={(e) => onChange({ venue: e.target.value })}
              className="somnus-input !py-2.5 text-sm"
              placeholder="Club or venue name"
            />
          </div>
          <div>
            <label htmlFor="event-address" className="block text-[11px] uppercase tracking-wider text-white/45 mb-1.5">
              Address (optional)
            </label>
            <input
              id="event-address"
              type="text"
              value={data.address}
              onChange={(e) => onChange({ address: e.target.value })}
              className="somnus-input !py-2.5 text-sm"
              placeholder="Street, city"
            />
          </div>
        </div>
      </ExpandablePill>

      {/* Collapsed: side-by-side chips. Open: full-width so content doesn't squash the row */}
      {open === "capacity" || open === "sales" ? (
        open === "capacity" ? (
          <ExpandablePill
            icon={Users}
            label="Capacity"
            valueText={data.maxCapacity ? `${data.maxCapacity.toLocaleString()}` : ""}
            placeholder="Set capacity"
            hasValue={Boolean(data.maxCapacity)}
            isOpen
            onToggle={() => toggle("capacity")}
          >
            <div className="pt-2 max-w-xs">
              <input
                id="event-capacity"
                type="number"
                min={1}
                value={data.maxCapacity || ""}
                onChange={(e) =>
                  onChange({ maxCapacity: parseInt(e.target.value, 10) || 0 })
                }
                className="somnus-input !py-2.5 text-sm"
                placeholder="500"
              />
            </div>
          </ExpandablePill>
        ) : (
          <ExpandablePill
            icon={CalendarClock}
            label="Sales window"
            valueText={data.salesStartDate && data.salesEndDate ? "Set" : ""}
            placeholder="Set window"
            hasValue={Boolean(data.salesStartDate && data.salesEndDate)}
            isOpen
            onToggle={() => toggle("sales")}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label htmlFor="sales-start" className="block text-[11px] uppercase tracking-wider text-white/45 mb-1.5">
                  Sales start *
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
                <label htmlFor="sales-end" className="block text-[11px] uppercase tracking-wider text-white/45 mb-1.5">
                  Sales end *
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
        )
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          <ExpandablePill
            icon={Users}
            label="Capacity"
            valueText={data.maxCapacity ? `${data.maxCapacity.toLocaleString()}` : ""}
            placeholder="Set capacity"
            hasValue={Boolean(data.maxCapacity)}
            isOpen={false}
            onToggle={() => toggle("capacity")}
            size="sm"
          >
            {null}
          </ExpandablePill>

          <ExpandablePill
            icon={CalendarClock}
            label="Sales window"
            valueText={data.salesStartDate && data.salesEndDate ? "Set" : ""}
            placeholder="Set window"
            hasValue={Boolean(data.salesStartDate && data.salesEndDate)}
            isOpen={false}
            onToggle={() => toggle("sales")}
            size="sm"
          >
            {null}
          </ExpandablePill>
        </div>
      )}
    </div>
  );
}

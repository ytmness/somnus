"use client";

import { useState } from "react";
import { Calendar, MapPin, Users, CalendarClock, Coins } from "lucide-react";
import { ExpandablePill } from "../ExpandablePill";
import {
  EVENT_FORM_CURRENCIES,
  EVENT_FORM_TIMEZONES,
  type EventFormCurrency,
  type EventFormData,
} from "../types";

type OpenPill = "when" | "location" | "capacity" | "sales" | "currency" | null;

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
        label="Date & time"
        valueText={whenValue}
        placeholder="Set date & time"
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
                Start date *
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
                Start time *
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
                End date
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
                End time
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
              Timezone
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
        label="Location"
        valueText={locationValue}
        placeholder="Set venue & address"
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
              placeholder="Club or venue name"
            />
          </div>
          <div>
            <label
              htmlFor="event-city"
              className="block text-[11px] uppercase tracking-wider text-white/45 mb-1.5"
            >
              City
            </label>
            <input
              id="event-city"
              type="text"
              value={data.city}
              onChange={(e) => onChange({ city: e.target.value })}
              className="somnus-input !py-2.5 text-sm"
              placeholder="Mexico City"
            />
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="event-address"
              className="block text-[11px] uppercase tracking-wider text-white/45 mb-1.5"
            >
              Address (optional)
            </label>
            <input
              id="event-address"
              type="text"
              value={data.address}
              onChange={(e) => onChange({ address: e.target.value })}
              className="somnus-input !py-2.5 text-sm"
              placeholder="Street, neighborhood"
            />
          </div>
        </div>
      </ExpandablePill>

      {open === "capacity" || open === "sales" || open === "currency" ? (
        open === "capacity" ? (
          <ExpandablePill
            icon={Users}
            label="Capacity"
            valueText={
              data.maxCapacity ? `${data.maxCapacity.toLocaleString()}` : ""
            }
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
        ) : open === "sales" ? (
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
                <label
                  htmlFor="sales-start"
                  className="block text-[11px] uppercase tracking-wider text-white/45 mb-1.5"
                >
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
                <label
                  htmlFor="sales-end"
                  className="block text-[11px] uppercase tracking-wider text-white/45 mb-1.5"
                >
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
        ) : (
          <ExpandablePill
            icon={Coins}
            label="Currency"
            valueText={data.currency}
            placeholder="MXN"
            hasValue={Boolean(data.currency)}
            isOpen
            onToggle={() => toggle("currency")}
          >
            <div className="pt-2 max-w-xs">
              <select
                id="event-currency"
                value={data.currency}
                onChange={(e) =>
                  onChange({
                    currency: e.target.value as EventFormCurrency,
                  })
                }
                className="somnus-input !py-2.5 text-sm"
              >
                {EVENT_FORM_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </ExpandablePill>
        )
      ) : (
        <div className="grid grid-cols-3 gap-2.5">
          <ExpandablePill
            icon={Users}
            label="Capacity"
            valueText={
              data.maxCapacity ? `${data.maxCapacity.toLocaleString()}` : ""
            }
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

          <ExpandablePill
            icon={Coins}
            label="Currency"
            valueText={data.currency}
            placeholder="MXN"
            hasValue={Boolean(data.currency)}
            isOpen={false}
            onToggle={() => toggle("currency")}
            size="sm"
          >
            {null}
          </ExpandablePill>
        </div>
      )}
    </div>
  );
}

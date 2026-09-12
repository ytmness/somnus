const MX_TZ = "America/Mexico_City";

function tzParts(
  date: Date,
  timeZone: string
): Record<"year" | "month" | "day" | "hour" | "minute" | "second", number> {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** Offset of `timeZone` vs UTC at `date`, in milliseconds (MX is typically −6h). */
function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const p = tzParts(date, timeZone);
  const asUtc = Date.UTC(
    p.year,
    p.month - 1,
    p.day,
    p.hour,
    p.minute,
    p.second
  );
  return asUtc - date.getTime();
}

function zonedCivilToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string
): Date {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const adjusted = new Date(utcGuess.getTime() - timeZoneOffsetMs(utcGuess, timeZone));
  return new Date(utcGuess.getTime() - timeZoneOffsetMs(adjusted, timeZone));
}

/** Instant of local midnight on day 1 of the current month in `timeZone`. */
export function startOfCurrentMonth(timeZone = MX_TZ): Date {
  const now = tzParts(new Date(), timeZone);
  return zonedCivilToUtc(now.year, now.month, 1, 0, 0, 0, timeZone);
}

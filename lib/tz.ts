// Program days are Vermont days: Hack Club HQ time, America/New_York.
export const TZ = "America/New_York";

const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

// "YYYY-MM-DD" of the Vermont day this instant falls on.
export const localDay = (d: Date): string => ymd.format(d);

// The instant Vermont midnight starts `day`, DST-correct: guess UTC midnight,
// then correct by however far the zone was off at that guess.
export function dayStart(day: string): Date {
  const guess = new Date(`${day}T00:00:00Z`);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(guess)
      .map((p) => [p.type, p.value]),
  );
  const asLocal = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  const offset = asLocal - guess.getTime();
  const out = new Date(guess.getTime() - offset);
  if (localDay(out) === day) return out;
  // The guess straddled a DST switch: the true midnight is an hour either side.
  const later = new Date(out.getTime() + 3_600_000);
  return localDay(later) === day && localDay(new Date(later.getTime() - 1000)) !== day ? later : new Date(out.getTime() - 3_600_000);
}

// Last instant of `day` (one second before the next Vermont midnight; the
// Hackatime window is inclusive on both ends).
export const dayEnd = (day: string): Date => new Date(dayStart(nextDay(day)).getTime() - 1000);

export function nextDay(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  return new Date(d.getTime() + 86_400_000).toISOString().slice(0, 10);
}

export const prevDay = (day: string): string => new Date(new Date(`${day}T12:00:00Z`).getTime() - 86_400_000).toISOString().slice(0, 10);

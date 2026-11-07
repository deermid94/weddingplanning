export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addMonths(d: Date, months: number): Date {
  const r = new Date(d);
  const day = r.getUTCDate();
  r.setUTCDate(1);
  r.setUTCMonth(r.getUTCMonth() + months);
  const last = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
  r.setUTCDate(Math.min(day, last));
  return r;
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86400000);
}

export function today(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
}

export function monthsBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (86400000 * 30.4375);
}

export function formatDate(d: Date, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  return d.toLocaleDateString("en-IE", { ...opts, timeZone: "UTC" });
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const dayName = (d: Date) => DAY_NAMES[d.getUTCDay()];

function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function firstMonday(year: number, month0: number): Date {
  const d = new Date(Date.UTC(year, month0, 1));
  while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

function lastMonday(year: number, month0: number): Date {
  const d = new Date(Date.UTC(year, month0 + 1, 0));
  while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

/** Irish public holidays that create long weekends (Monday holidays). */
export function irishBankHolidayMondays(year: number): { date: Date; name: string }[] {
  const feb1 = new Date(Date.UTC(year, 1, 1));
  const brigid = feb1.getUTCDay() === 5 ? feb1 : firstMonday(year, 1);
  return [
    { date: brigid, name: "St Brigid's Day" },
    { date: addDays(easterSunday(year), 1), name: "Easter Monday" },
    { date: firstMonday(year, 4), name: "May bank holiday" },
    { date: firstMonday(year, 5), name: "June bank holiday" },
    { date: firstMonday(year, 7), name: "August bank holiday" },
    { date: lastMonday(year, 9), name: "October bank holiday" },
  ];
}

/** Returns the holiday name if the date is Fri–Mon of an Irish bank-holiday weekend. */
export function bankHolidayWeekend(d: Date): string | null {
  for (const h of irishBankHolidayMondays(d.getUTCFullYear())) {
    const diff = Math.round((h.date.getTime() - d.getTime()) / 86400000);
    // Holiday on Monday: Fri (3), Sat (2), Sun (1), Mon (0). St Brigid's on a Friday: Fri–Sun.
    if (h.date.getUTCDay() === 1 && diff >= 0 && diff <= 3) return h.name;
    if (h.date.getUTCDay() === 5 && diff <= 0 && diff >= -2) return h.name;
  }
  return null;
}

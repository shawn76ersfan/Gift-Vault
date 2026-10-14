export type YMD = { year: number; month: number; day: number };

const DAY_MS = 24 * 60 * 60 * 1000;

export const SEND_HOUR_UTC = 14;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isValidMonthDay(month: number, day: number): boolean {
  return Number.isInteger(month) && Number.isInteger(day) && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(2024, month);
}

export function parseYmd(value: string): YMD {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error('Date must be formatted as YYYY-MM-DD');
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export function fromUtcMs(ms: number): YMD {
  const d = new Date(ms);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function toUtcMs(date: YMD, hourUtc = 0): number {
  return Date.UTC(date.year, date.month - 1, date.day, hourUtc);
}

export function addDays(date: YMD, days: number): YMD {
  return fromUtcMs(toUtcMs(date) + days * DAY_MS);
}

export function daysBetween(from: YMD, to: YMD): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS);
}

function inYear(year: number, month: number, day: number): YMD {
  return { year, month, day: Math.min(day, daysInMonth(year, month)) };
}

export function nextOccurrence(month: number, day: number, today: YMD): YMD {
  const thisYear = inYear(today.year, month, day);
  return daysBetween(today, thisYear) >= 0 ? thisYear : inYear(today.year + 1, month, day);
}

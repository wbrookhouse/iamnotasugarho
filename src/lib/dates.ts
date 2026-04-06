import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { differenceInCalendarDays, parseISO } from 'date-fns';

export const TIMEZONE = 'America/Halifax';
export const START_DATE = '2026-04-01';
export const OVERALL_START_DATE = '2026-02-24';
export const Q2_START = '2026-04-01';
export const Q2_END = '2026-06-30';

/** Return which 14-day period (0-based) a given date falls into, relative to Q2_START */
export function get14DayPeriod(dateStr: string): number {
  const start = new Date(Q2_START + 'T00:00:00');
  const d = new Date(dateStr + 'T00:00:00');
  const diff = Math.floor((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.floor(diff / 14);
}
export const END_DATE = '2026-12-31';

export function getTodayLocal(): string {
  return formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd');
}

export function getNowLocalTime(): string {
  return formatInTimeZone(new Date(), TIMEZONE, 'h:mm a');
}

export function getDaysLeftInYear(): number {
  const today = getTodayLocal();
  const end = END_DATE;
  if (today > end) return 0;
  if (today < START_DATE) {
    return differenceInCalendarDays(parseISO(end), parseISO(START_DATE)) + 1;
  }
  return differenceInCalendarDays(parseISO(end), parseISO(today)) + 1;
}

export function isBeforeStart(): boolean {
  return getTodayLocal() < START_DATE;
}

export function isAfterEnd(): boolean {
  return getTodayLocal() > END_DATE;
}

export function formatDateLocal(dateStr: string): string {
  const d = parseISO(dateStr);
  return formatInTimeZone(d, TIMEZONE, 'MMM d');
}

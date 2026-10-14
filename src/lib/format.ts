import { ConvexError } from 'convex/values';

import type { Doc } from '@convex/_generated/dataModel';

export type OccasionType = Doc<'occasions'>['type'];

export const OCCASION_TYPES: { value: OccasionType; label: string; emoji: string }[] = [
  { value: 'birthday', label: 'Birthday', emoji: '🎂' },
  { value: 'anniversary', label: 'Anniversary', emoji: '💞' },
  { value: 'holiday', label: 'Holiday', emoji: '🎄' },
  { value: 'custom', label: 'Custom', emoji: '✨' },
];

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function formatMoney(cents: number, { showCents = false }: { showCents?: boolean } = {}): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  });
}

export function todayString(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function monthStartMs(date = new Date()): number {
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
}

export function occasionTitle(occasion: Pick<Doc<'occasions'>, 'type' | 'label'>): string {
  if (occasion.label) return occasion.label;
  return OCCASION_TYPES.find((t) => t.value === occasion.type)?.label ?? 'Occasion';
}

export function occasionEmoji(type: OccasionType): string {
  return OCCASION_TYPES.find((t) => t.value === type)?.emoji ?? '🎁';
}

export function formatMonthDay(month: number, day: number): string {
  return `${MONTHS[month - 1]?.slice(0, 3) ?? ''} ${day}`;
}

export function formatCountdown(daysUntil: number): string {
  if (daysUntil === 0) return 'Today';
  if (daysUntil === 1) return 'Tomorrow';
  if (daysUntil < 7) return `In ${daysUntil} days`;
  if (daysUntil < 14) return 'Next week';
  if (daysUntil < 60) return `In ${Math.round(daysUntil / 7)} weeks`;
  return `In ${Math.round(daysUntil / 30)} months`;
}

export function parseDollarsToCents(input: string): number | null {
  const cleaned = input.replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

export function errorMessage(error: unknown): string {
  if (error instanceof ConvexError && typeof error.data === 'string') return error.data;
  if (error instanceof Error) {
    const match = /Uncaught Error: (.+?)(\n|$)/.exec(error.message);
    return match?.[1] ?? error.message;
  }
  return 'Something went wrong';
}

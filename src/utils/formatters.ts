import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { OccupancyLevel, BusStatus } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

export function getOccupancyConfig(level: OccupancyLevel | string) {
  switch (level) {
    case 'low':
      return { label: 'Seats Available', labelMarathi: 'जागा उपलब्ध', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotColor: 'bg-emerald-500' };
    case 'moderate':
    case 'medium':
      return { label: 'Moderate', labelMarathi: 'मध्यम', color: 'bg-amber-50 text-amber-700 border-amber-200', dotColor: 'bg-amber-500' };
    case 'high':
      return { label: 'Crowded', labelMarathi: 'गर्दी', color: 'bg-rose-50 text-rose-700 border-rose-200', dotColor: 'bg-rose-500' };
    default:
      return { label: 'Unknown', labelMarathi: 'अज्ञात', color: 'bg-slate-50 text-slate-700 border-slate-200', dotColor: 'bg-slate-500' };
  }
}

export function getStatusConfig(status: BusStatus | string, delayMinutes?: number) {
  switch (status) {
    case 'on_time':
      return { label: 'On Time', labelMarathi: 'वेळेवर', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'delayed':
      return { label: `Delayed ${delayMinutes || 5}m`, labelMarathi: `${delayMinutes || 5} मि. उशीर`, color: 'bg-amber-50 text-amber-800 border-amber-200' };
    case 'early':
      return { label: 'Early', labelMarathi: 'वेळेआधी', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    default:
      return { label: 'Unknown', labelMarathi: 'अज्ञात', color: 'bg-slate-50 text-slate-700 border-slate-200' };
  }
}

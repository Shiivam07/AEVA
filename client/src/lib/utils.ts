import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string | null | undefined, currency = 'INR'): string {
  if (amount === null || amount === undefined) return '—'
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(num)
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function truncate(str: string, length = 50): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '…'
}

export const TASK_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  ASSIGNED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ACCEPTED: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  IN_PROGRESS: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  BLOCKED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  SUBMITTED_FOR_REVIEW: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  REVISION_REQUIRED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
}

export const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  MEDIUM: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  HIGH: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  URGENT: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
}

export const ORDER_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PLANNED: 'bg-blue-100 text-blue-700',
  PLACED: 'bg-cyan-100 text-cyan-700',
  PROCESSING: 'bg-purple-100 text-purple-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  RETURNED: 'bg-orange-100 text-orange-700',
}

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  NOT_DUE: 'bg-gray-100 text-gray-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  PARTIALLY_PAID: 'bg-blue-100 text-blue-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
  DISPUTED: 'bg-orange-100 text-orange-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

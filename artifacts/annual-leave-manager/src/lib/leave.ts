import type { LeaveRequestStatus, LeaveType } from '@workspace/api-client-react';

export const leaveTypeLabels: Record<LeaveType, string> = {
  annual: '연차',
  half_day_am: '오전 반차',
  half_day_pm: '오후 반차',
  personal: '개인 사유',
};

export const statusLabels: Record<LeaveRequestStatus, string> = {
  pending: '승인 대기',
  approved: '승인 완료',
  rejected: '반려',
  cancelled: '취소',
};

export function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' }).format(date);
}

export function formatShortDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date).replaceAll(' ', '');
}

export function formatDays(days: number) {
  return Number.isInteger(days) ? `${days}일` : `${days.toFixed(1)}일`;
}

export function initials(name: string) {
  return name.trim().slice(0, 1) || '직';
}
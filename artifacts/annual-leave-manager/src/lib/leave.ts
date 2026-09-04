import type { LeaveRequestStatus, LeaveType } from '@workspace/api-client-react';

export const leaveTypeLabels: Record<LeaveType, string> = {
  annual: '연차',
  half_day: '반차',
  quarter_day: '반반차',
  early_leave: '조퇴',
  outing: '외출',
  wedding_funeral: '경조휴가',
  paid_leave: '유급휴가',
  public_leave: '공가',
  sick_leave: '병가',
  substitute: '대체휴무',
  absence: '결근',
  attendance_other: '기타',
  sabbatical: '안식월',
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
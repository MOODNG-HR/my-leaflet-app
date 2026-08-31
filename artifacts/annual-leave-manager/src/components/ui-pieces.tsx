import { AlertCircle, ArrowUpRight, Check, Loader2, RefreshCw } from 'lucide-react';
import type { LeaveRequestStatus } from '@workspace/api-client-react';
import { statusLabels } from '@/lib/leave';

export function StatusBadge({ status }: { status: LeaveRequestStatus }) {
  const tone = status === 'approved' ? 'bg-[#e5f2e7] text-[#27643d]' : status === 'rejected' ? 'bg-[#f8e5e0] text-[#a34738]' : status === 'cancelled' ? 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]' : 'bg-[#fff1cf] text-[#856123]';
  return <span data-testid={`status-badge-${status}`} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${tone}`}><span className={`h-1.5 w-1.5 rounded-full ${status === 'approved' ? 'bg-[#4e9c61]' : status === 'rejected' ? 'bg-[#c35a4b]' : status === 'cancelled' ? 'bg-[#9aa3a0]' : 'bg-[#d39b2f]'}`} />{statusLabels[status]}</span>;
}

export function Avatar({ name, color = 'teal' }: { name: string; color?: 'teal' | 'peach' | 'gold' | 'sage' }) {
  const colors = { teal: 'bg-[#d6e9e4] text-[#21605c]', peach: 'bg-[#f7ded2] text-[#a14f3d]', gold: 'bg-[#f5e7bd] text-[#866522]', sage: 'bg-[#dce8d2] text-[#4d7045]' };
  return <div data-testid={`avatar-${name}`} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold ${colors[color]}`}>{name.slice(0, 1)}</div>;
}

export function LoadingRows({ count = 4 }: { count?: number }) {
  return <div className="space-y-3" data-testid="loading-state">{Array.from({ length: count }).map((_, i) => <div key={i} className="skeleton h-[62px] rounded-xl" />)}</div>;
}

export function QueryError({ onRetry }: { onRetry: () => void }) {
  return <div data-testid="error-state" className="flex flex-col items-center justify-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-6 py-16 text-center"><div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#f8e5e0] text-[#a34738]"><AlertCircle size={20} /></div><h3 className="text-sm font-bold">정보를 불러오지 못했어요</h3><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">잠시 후 다시 시도해 주세요.</p><button type="button" onClick={onRetry} data-testid="button-retry" className="mt-5 inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] px-3 py-2 text-xs font-bold hover:bg-[hsl(var(--muted))]"><RefreshCw size={13} />다시 시도</button></div>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div data-testid="empty-state" className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--border))] px-6 py-16 text-center"><div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--primary))]"><Check size={20} /></div><h3 className="text-sm font-bold">{title}</h3><p className="mt-1 max-w-xs text-xs leading-5 text-[hsl(var(--muted-foreground))]">{description}</p></div>;
}

export function ActionButton({ children, onClick, disabled, kind = 'primary', testId }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; kind?: 'primary' | 'quiet' | 'danger'; testId: string }) {
  const styles = kind === 'primary' ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:brightness-110' : kind === 'danger' ? 'border border-[#efc9c0] text-[#a34738] hover:bg-[#f8e5e0]' : 'border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]';
  return <button type="button" disabled={disabled} onClick={onClick} data-testid={testId} className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[12px] font-bold transition-all active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 ${styles}`}>{disabled && <Loader2 className="animate-spin" size={13} />}{children}</button>;
}

export function SectionHeading({ label, link, onLink }: { label: string; link?: string; onLink?: () => void }) {
  return <div className="mb-4 flex items-center justify-between"><h2 className="text-[15px] font-extrabold tracking-[-.03em]">{label}</h2>{link && <button type="button" onClick={onLink} data-testid={`button-section-${label}`} className="group flex items-center gap-1 text-[11px] font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]">{link}<ArrowUpRight size={13} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></button>}</div>;
}
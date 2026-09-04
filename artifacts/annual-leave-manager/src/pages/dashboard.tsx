import { useMemo } from 'react';
import { CalendarDays, ChevronRight, CircleCheck, Clock3, UsersRound } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useGetDashboardSummary } from '@workspace/api-client-react';
import { PageHeader } from '@/components/layout';
import { EmptyState, QueryError, SectionHeading, StatusBadge, Avatar } from '@/components/ui-pieces';
import { formatDate, formatDays, leaveTypeLabels } from '@/lib/leave';

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const summaryQuery = useGetDashboardSummary();
  const summary = summaryQuery.data;

  const maxUsage = useMemo(() => Math.max(...(summary?.monthlyUsage?.map((month) => month.days) || [1]), 1), [summary?.monthlyUsage]);
  const usageTotal = summary?.monthlyUsage?.reduce((sum, month) => sum + month.days, 0) || 0;
  const usageRatio = summary?.annualAllowance ? Math.round((summary.usedDays / summary.annualAllowance) * 100) : 0;

  return (
    <div>
      <PageHeader eyebrow="연차 관리" title="오늘의 휴가 현황" description="필요한 결재와 잔여 일수를 한눈에 확인하세요." action={<Link href="/apply" data-testid="link-apply-header" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-[12px] font-bold text-[hsl(var(--primary-foreground))] transition hover:brightness-110"><CalendarDays size={15} />휴가 신청</Link>} />
      <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 md:px-10 md:py-9">
        {summaryQuery.isLoading && <DashboardSkeleton />}
        {summaryQuery.isError && <QueryError onRetry={() => summaryQuery.refetch()} />}
        {summary && <div className="space-y-7">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="전체 구성원" value={`${summary.employeeCount}명`} sub="현재 재직자 기준" icon={<UsersRound size={18} />} tone="teal" delay="delay-1" />
            <MetricCard label="승인 대기" value={`${summary.pendingRequestCount}건`} sub={`${formatDays(summary.pendingDays)} 사용 예정`} icon={<Clock3 size={18} />} tone="gold" delay="delay-2" action={() => setLocation('/requests?status=pending')} />
            <MetricCard label="승인 완료" value={`${summary.approvedRequestCount}건`} sub="올해 누적 신청 기준" icon={<CircleCheck size={18} />} tone="sage" delay="delay-3" />
            <MetricCard label={`${summary.year}년 사용 현황`} value={`${usageRatio}%`} sub={`${formatDays(summary.usedDays)} 사용 · ${formatDays(summary.remainingDays)} 남음`} icon={<CalendarDays size={18} />} tone="peach" delay="delay-4" />
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
            <div className="surface animate-rise p-5 sm:p-6">
              <SectionHeading label="올해 연차 사용 흐름" link="구성원별 보기" onLink={() => setLocation('/employees')} />
              <div className="mb-5 flex items-end justify-between"><div><div className="font-mono text-[29px] font-medium tracking-[-.06em]">{formatDays(summary.usedDays)}</div><div className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">전체 {formatDays(summary.annualAllowance)} 중</div></div><div className="text-right"><div className="font-mono text-[12px] text-[hsl(var(--primary))]">{usageTotal.toFixed(1)}일</div><div className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">월별 누계</div></div></div>
              <div className="flex h-[150px] items-end gap-2 border-b border-[hsl(var(--border))] pb-0 sm:gap-3" data-testid="chart-monthly-usage">
                {(summary.monthlyUsage || []).map((month) => <div className="group flex h-full flex-1 flex-col items-center justify-end gap-2" key={month.month}><div className="relative w-full max-w-[34px] rounded-t-md bg-[hsl(var(--primary)/.82)] transition-all duration-300 group-hover:bg-[hsl(var(--primary))]" style={{ height: `${Math.max((month.days / maxUsage) * 82, month.days ? 7 : 2)}%` }}><span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 rounded bg-[hsl(var(--foreground))] px-1.5 py-1 font-mono text-[9px] text-[hsl(var(--card))] group-hover:block">{month.days}</span></div><span className="pb-2 font-mono text-[10px] text-[hsl(var(--muted-foreground))]">{month.month.replace('월', '')}</span></div>)}
              </div>
              <div className="mt-4 flex items-center gap-4 text-[10px] text-[hsl(var(--muted-foreground))]"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-[hsl(var(--primary))]" />사용 일수</span><span>막대 위에 마우스를 올리면 월별 수치를 확인할 수 있어요.</span></div>
            </div>

            <div className="surface animate-rise delay-1 p-5 sm:p-6">
              <SectionHeading label="잔여 연차" link="구성원 관리" onLink={() => setLocation('/employees')} />
              <div className="relative mx-auto my-4 flex h-[150px] w-[150px] items-center justify-center rounded-full" style={{ background: `conic-gradient(hsl(var(--primary)) ${usageRatio}%, hsl(var(--muted)) 0)` }}>
                <div className="flex h-[116px] w-[116px] flex-col items-center justify-center rounded-full bg-[hsl(var(--card))]"><span className="font-mono text-[28px] font-medium tracking-[-.07em]">{summary.remainingDays}</span><span className="text-[10px] text-[hsl(var(--muted-foreground))]">남은 일수</span></div>
              </div>
              <div className="mt-5 grid grid-cols-3 divide-x divide-[hsl(var(--border))] text-center"><BalanceValue label="부여" value={summary.annualAllowance} /><BalanceValue label="사용" value={summary.usedDays} /><BalanceValue label="대기" value={summary.pendingDays} /></div>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
            <div className="surface animate-rise delay-2 p-5 sm:p-6">
              <SectionHeading label="승인 대기 중인 신청" link="전체 승인함" onLink={() => setLocation('/requests')} />
              {summary.pendingRequestCount === 0 || !summary.upcomingLeaves?.length ? <EmptyState title="대기 중인 신청이 없어요" description="새로운 휴가 신청이 도착하면 이곳에서 바로 확인할 수 있어요." /> : <div className="divide-y divide-[hsl(var(--border))]">{summary.upcomingLeaves.slice(0, 4).map((leave) => <button type="button" onClick={() => setLocation('/requests')} data-testid={`button-pending-leave-${leave.id}`} key={leave.id} className="flex w-full items-center gap-3 py-3 text-left transition-colors first:pt-0 last:pb-0 hover:bg-[hsl(var(--muted)/.45)]"><Avatar name={leave.employeeName} color={leave.id % 2 ? 'teal' : 'peach'} /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="truncate text-[12px] font-bold">{leave.employeeName}</span><StatusBadge status="pending" /></div><div className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">{leaveTypeLabels[leave.leaveType]} · {formatDate(leave.startDate)} · {formatDays(leave.days)}</div></div><ChevronRight size={15} className="text-[hsl(var(--muted-foreground))]" /></button>)}</div>}
            </div>
            <div className="surface animate-rise delay-3 overflow-hidden p-5 sm:p-6">
              <SectionHeading label="다가오는 휴가" link="전체 보기" onLink={() => setLocation('/requests')} />
              {summary.upcomingLeaves?.length ? <div className="relative ml-2 border-l border-[hsl(var(--border))] pl-5">{summary.upcomingLeaves.slice(0, 4).map((leave, index) => <div key={leave.id} className="relative mb-5 last:mb-0"><div className="absolute -left-[26px] top-1.5 h-2 w-2 rounded-full border-2 border-[hsl(var(--card))] bg-[hsl(var(--primary))]" /><div className="font-mono text-[10px] text-[hsl(var(--primary))]">{formatDate(leave.startDate)}</div><div className="mt-1 text-[12px] font-bold">{leave.employeeName}<span className="ml-2 font-normal text-[hsl(var(--muted-foreground))]">{leaveTypeLabels[leave.leaveType]}</span></div><div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{formatDays(leave.days)} · {index === 0 ? '가장 가까운 일정' : '예정된 일정'}</div></div>)}</div> : <EmptyState title="예정된 휴가가 없어요" description="승인된 휴가 일정이 이곳에 표시됩니다." />}
            </div>
          </section>
        </div>}
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, icon, tone, delay, action }: { label: string; value: string; sub: string; icon: React.ReactNode; tone: 'teal' | 'gold' | 'sage' | 'peach'; delay: string; action?: () => void }) {
  const tones = { 
    teal: 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]', 
    gold: 'bg-[hsl(var(--accent)/.2)] text-[hsl(var(--accent))]', 
    sage: 'bg-[hsl(var(--secondary)/.5)] text-[hsl(var(--foreground))]', 
    peach: 'bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]' 
  };
  return <button type="button" onClick={action} data-testid={`card-metric-${label}`} className={`surface animate-rise ${delay} group text-left p-5 transition-transform hover:-translate-y-0.5 ${action ? 'cursor-pointer' : 'cursor-default'}`}><div className="flex items-start justify-between"><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</span>{action && <ChevronRight size={15} className="text-[hsl(var(--muted-foreground))] transition-transform group-hover:translate-x-1" />}</div><div className="mt-5 font-mono text-[27px] font-bold tracking-[-.07em]">{value}</div><div className="mt-1 text-[12px] font-semibold">{label}</div><div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{sub}</div></button>;
}

function BalanceValue({ label, value }: { label: string; value: number }) { return <div><div className="font-mono text-[14px]">{value}</div><div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{label}</div></div>; }
function DashboardSkeleton() { return <div className="space-y-7" data-testid="dashboard-loading"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-[168px] rounded-2xl" />)}</div><div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]"><div className="skeleton h-[300px] rounded-2xl" /><div className="skeleton h-[300px] rounded-2xl" /></div></div>; }
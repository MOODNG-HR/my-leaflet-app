import { useState } from 'react';
import { BriefcaseBusiness, CalendarRange, Clock3 } from 'lucide-react';
import {
  getGetLeaveRequestsQueryKey,
  getGetMyEmployeeQueryKey,
  useGetLeaveRequests,
  useGetMyEmployee,
} from '@workspace/api-client-react';
import { PageHeader } from '@/components/layout';
import { EmptyState, LoadingRows, QueryError, StatusBadge } from '@/components/ui-pieces';
import { formatDate, formatDays, formatShortDate, leaveTypeLabels } from '@/lib/leave';

export default function MyLeavePage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(0);
  const profileQuery = useGetMyEmployee({
    query: { retry: false, queryKey: getGetMyEmployeeQueryKey() },
  });
  const employee = profileQuery.data;
  const requestParams = { employeeId: employee?.id, year, month: month || undefined };
  const requestsQuery = useGetLeaveRequests(
    requestParams,
    {
      query: {
        enabled: Boolean(employee?.id),
        queryKey: getGetLeaveRequestsQueryKey(requestParams),
      },
    },
  );

  const balance = employee;
  const requests = requestsQuery.data || [];

  return (
    <div>
      <PageHeader 
        eyebrow="나의 휴가" 
        title="나의 연차 현황" 
        description="올해 남은 연차와 전체 신청 내역을 확인할 수 있습니다." 
      />
      
      <div className="mx-auto max-w-[1060px] px-5 py-7 sm:px-8 md:px-10 md:py-9">
        {profileQuery.isLoading && <LoadingRows count={3} />}
        {profileQuery.isError && (
          <EmptyState
            title="직원 프로필을 준비하고 있어요"
            description="가입 직후라면 잠시 후 새로고침해 주세요. 계속 보이면 다시 로그인해 주세요."
          />
        )}
        
        {balance && (
          <div className="space-y-6">
            <section className="surface p-6 sm:p-8">
              <div className="mb-6 flex items-center gap-2 text-sm font-bold">
                <CalendarRange size={16} className="text-[hsl(var(--primary))]" />
                올해 연차 잔여
              </div>
              
              <div className="grid gap-4 sm:grid-cols-3">
                <BalanceCard label="총 부여 연차" value={balance.annualAllowance} />
                <BalanceCard label="사용 완료" value={balance.usedDays} />
                <BalanceCard label="현재 남은 연차" value={balance.remainingDays} highlighted />
              </div>
              
              <div className="mt-8 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.3)] p-5">
                <div className="mb-3 flex justify-between text-[11px] font-bold">
                  <span className="text-[hsl(var(--muted-foreground))]">사용률</span>
                  <span className="font-mono">{balance.annualAllowance ? Math.round((balance.usedDays / balance.annualAllowance) * 100) : 0}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
                  <div 
                    className="h-full rounded-full bg-[hsl(var(--primary))]" 
                    style={{ width: `${balance.annualAllowance ? (balance.usedDays / balance.annualAllowance) * 100 : 0}%` }} 
                  />
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[hsl(var(--muted-foreground))]">
                  <Clock3 size={13} />
                  승인 대기 중인 {formatDays(balance.pendingDays)} 포함 시 잔여 {formatDays(balance.remainingDays)}
                </div>
              </div>
            </section>

            <section className="surface overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/.45)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-[13px] font-extrabold">연도·월별 신청 내역</div>
                <div className="flex gap-2">
                  <select value={year} onChange={(event) => setYear(Number(event.target.value))} className="h-9 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-xs font-bold">
                    {[currentYear, currentYear - 1, currentYear - 2].map((value) => <option key={value} value={value}>{value}년</option>)}
                  </select>
                  <select value={month} onChange={(event) => setMonth(Number(event.target.value))} className="h-9 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-xs font-bold">
                    <option value={0}>전체 월</option>
                    {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value}월</option>)}
                  </select>
                </div>
              </div>
              
              {requestsQuery.isLoading && <div className="p-5"><LoadingRows count={3} /></div>}
              {requestsQuery.isError && <div className="p-5"><QueryError onRetry={() => requestsQuery.refetch()} /></div>}
              
              {!requestsQuery.isLoading && !requestsQuery.isError && requests.length === 0 && (
                <div className="p-10">
                  <EmptyState title="신청한 내역이 없어요" description="휴가 신청을 진행하면 이곳에 내역이 기록됩니다." />
                </div>
              )}
              
              {requests.length > 0 && (
                <div className="divide-y divide-[hsl(var(--border))]">
                  {requests.map((req) => (
                    <div key={req.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={req.status} />
                          <span className="font-mono text-[11px] text-[hsl(var(--muted-foreground))]">{formatShortDate(req.createdAt)} 신청</span>
                        </div>
                        <div className="mt-3 flex items-end gap-3">
                          <span className="text-[15px] font-bold">{leaveTypeLabels[req.leaveType]}</span>
                          <span className="font-mono text-[12px]">{formatDays(req.days)}</span>
                        </div>
                        <div className="mt-1 text-[13px] text-[hsl(var(--muted-foreground))]">
                          {formatDate(req.startDate)} — {formatDate(req.endDate)}
                        </div>
                        {req.reason && (
                          <div className="mt-3 rounded-lg bg-[hsl(var(--muted)/.5)] p-3 text-[12px] leading-relaxed">
                            <span className="font-bold">사유</span>: {req.reason}
                          </div>
                        )}
                        {req.rejectionReason && req.status === 'rejected' && (
                          <div className="mt-2 rounded-lg bg-[hsl(var(--destructive)/.1)] p-3 text-[12px] leading-relaxed text-[hsl(var(--destructive))]">
                            <span className="font-bold">반려 사유</span>: {req.rejectionReason}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function BalanceCard({ label, value, highlighted = false }: { label: string; value: number; highlighted?: boolean }) { 
  return (
    <div className={`rounded-xl p-5 ${highlighted ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border border-[hsl(var(--border))] bg-[hsl(var(--card))]'}`}>
      <div className={`mt-1 text-[12px] font-bold ${highlighted ? 'text-[hsl(var(--primary-foreground)/.8)]' : 'text-[hsl(var(--muted-foreground))]'}`}>{label}</div>
      <div className="mt-3 font-mono text-3xl tracking-[-.07em]">{value}</div>
    </div>
  ); 
}
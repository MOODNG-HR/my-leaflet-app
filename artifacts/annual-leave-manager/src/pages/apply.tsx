import { useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, CalendarDays, CheckCircle2, Info } from 'lucide-react';
import { Link } from 'wouter';
import { LeaveType, useGetEmployees } from '@workspace/api-client-react';
import { PageHeader } from '@/components/layout';
import { ActionButton, QueryError, LoadingRows } from '@/components/ui-pieces';
import { formatDays, leaveTypeLabels } from '@/lib/leave';
import { useLeaveActions } from '@/hooks/use-leave-actions';

export default function ApplyPage() {
  const employeesQuery = useGetEmployees();
  const actions = useLeaveActions();
  const [employeeId, setEmployeeId] = useState('');
  const [leaveType, setLeaveType] = useState<keyof typeof LeaveType>('annual');
  const [timeSlot, setTimeSlot] = useState<'start' | 'end'>('start');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const employees = employeesQuery.data || [];
  const selectedEmployee = employees.find((employee) => String(employee.id) === employeeId);
  const days = useMemo(() => calculateDays(startDate, endDate, leaveType), [startDate, endDate, leaveType]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!employeeId || !startDate || !endDate || !reason.trim()) { setError('신청자, 기간, 사유를 모두 입력해 주세요.'); return; }
    if (days < 0.25) { setError('종료일은 시작일 이후로 선택해 주세요.'); return; }
    if (['annual', 'half_day', 'quarter_day'].includes(leaveType) && selectedEmployee && days > selectedEmployee.remainingDays) {
      setError(`잔여 연차가 부족합니다. 현재 ${formatDays(selectedEmployee.remainingDays)} 남아 있습니다.`);
      return;
    }
    actions.createRequest.mutate(
      {
        data: {
          employeeId: Number(employeeId),
          leaveType,
          timeSlot: ['half_day', 'quarter_day'].includes(leaveType) ? timeSlot : null,
          startDate,
          endDate,
          days,
          reason: reason.trim(),
        },
      },
      {
        onSuccess: () => { actions.refreshLeaveData(); setSubmitted(true); },
        onError: (mutationError) => setError(mutationError.message || '신청을 저장하지 못했습니다.'),
      },
    );
  };

  if (submitted) return <div><PageHeader eyebrow="신청 완료" title="휴가 신청이 접수됐어요" description="관리자 승인 후 휴가 일정이 확정됩니다." /><div className="mx-auto max-w-[640px] px-5 py-12 sm:px-8 md:py-16"><div className="surface animate-rise p-8 text-center sm:p-12"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><CheckCircle2 size={30} /></div><h2 className="mt-6 text-xl font-extrabold tracking-[-.05em]">신청 내용을 확인해 주세요</h2><div className="mx-auto mt-6 max-w-sm divide-y divide-[hsl(var(--border))] rounded-xl border border-[hsl(var(--border))] text-left"><ConfirmRow label="신청자" value={selectedEmployee?.name || employeeId} /><ConfirmRow label="휴가 종류" value={leaveTypeLabels[leaveType]} /><ConfirmRow label="사용 기간" value={`${startDate} — ${endDate}`} /><ConfirmRow label="사용 일수" value={formatDays(days)} /></div><div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row"><Link href="/app" data-testid="link-view-request-after-submit" className="inline-flex items-center justify-center rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))] hover:brightness-110">나의 휴가에서 확인</Link><button type="button" onClick={() => { setSubmitted(false); setReason(''); setStartDate(''); setEndDate(''); }} data-testid="button-new-application" className="rounded-lg border border-[hsl(var(--border))] px-4 py-2.5 text-xs font-bold hover:bg-[hsl(var(--muted))]">새로 신청하기</button></div></div></div></div>;

  return <div><PageHeader eyebrow="휴가 신청" title="휴가 신청" description="몇 가지 정보만 입력하면 신청이 완료됩니다." action={<Link href="/app" data-testid="link-back-dashboard" className="inline-flex items-center gap-2 text-[12px] font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]"><ArrowLeft size={15} />나의 휴가로 돌아가기</Link>} /><div className="mx-auto grid max-w-[1060px] gap-5 px-5 py-7 sm:px-8 md:grid-cols-[1fr_300px] md:py-10"><div className="surface p-5 sm:p-8"><form onSubmit={submit} data-testid="form-leave-application"><div className="mb-7"><div className="eyebrow mb-2">01 · 신청 정보</div><h2 className="text-lg font-extrabold tracking-[-.04em]">누구의 휴가인가요?</h2></div>{employeesQuery.isLoading && <LoadingRows count={2} />}{employeesQuery.isError && <QueryError onRetry={() => employeesQuery.refetch()} />}{!employeesQuery.isLoading && !employeesQuery.isError && <><label className="mb-6 block"><span className="mb-2 block text-[11px] font-bold">신청자</span><select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} data-testid="select-employee" className="h-11 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring)/.1)]"><option value="">신청자를 선택해 주세요</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · {employee.department} · 잔여 {formatDays(employee.remainingDays)}</option>)}</select></label><div className="mb-7"><span className="mb-2 block text-[11px] font-bold">휴가 종류</span><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{(Object.keys(LeaveType) as (keyof typeof LeaveType)[]).filter((type) => type !== 'absence').map((type) => <button type="button" key={type} onClick={() => setLeaveType(type)} data-testid={`button-leave-type-${type}`} className={`rounded-lg border px-2 py-3 text-[11px] font-bold transition-colors ${leaveType === type ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'}`}>{leaveTypeLabels[type]}</button>)}</div>{['half_day', 'quarter_day'].includes(leaveType) && <div className="mt-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.35)] p-3"><div className="mb-2 text-[11px] font-bold">근무 시작 또는 종료에 연결</div><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setTimeSlot('start')} className={`rounded-lg px-3 py-2 text-xs font-bold ${timeSlot === 'start' ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--card))]'}`}>출근 시간부터</button><button type="button" onClick={() => setTimeSlot('end')} className={`rounded-lg px-3 py-2 text-xs font-bold ${timeSlot === 'end' ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--card))]'}`}>퇴근 시간까지</button></div></div>}</div><div className="mb-7"><div className="eyebrow mb-2">02 · 일정 선택</div><h2 className="mb-4 text-lg font-extrabold tracking-[-.04em]">언제 쉬나요?</h2><div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-2 block text-[11px] font-bold">시작일</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} data-testid="input-start-date" className="h-11 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring)/.1)]" /></label><label><span className="mb-2 block text-[11px] font-bold">종료일</span><input type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} data-testid="input-end-date" className="h-11 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring)/.1)]" /></label></div></div><div className="mb-7"><div className="eyebrow mb-2">03 · 남길 말</div><h2 className="mb-4 text-lg font-extrabold tracking-[-.04em]">휴가 사유를 알려주세요</h2><textarea value={reason} onChange={(event) => setReason(event.target.value)} data-testid="textarea-leave-reason" placeholder="업무 인수인계에 필요한 내용을 함께 적어 주세요." className="min-h-[112px] w-full resize-y rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] p-3 text-xs leading-6 outline-none focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring)/.1)]" /></div>{error && <div data-testid="form-error" className="mb-4 rounded-lg bg-[hsl(var(--destructive)/.1)] border border-[hsl(var(--destructive-border))] px-3 py-2.5 text-xs font-semibold text-[hsl(var(--destructive))]">{error}</div>}<div className="flex items-center justify-between gap-4 border-t border-[hsl(var(--border))] pt-5"><div className="text-[11px] text-[hsl(var(--muted-foreground))]"><span className="font-mono text-lg text-[hsl(var(--foreground))]">{days > 0 ? formatDays(days) : '—'}</span><span className="ml-2">사용 예정</span></div><ActionButton testId="button-submit-leave-application" onClick={() => { const form = document.querySelector<HTMLFormElement>('[data-testid="form-leave-application"]'); form?.requestSubmit(); }} disabled={actions.createRequest.isPending}>신청서 제출</ActionButton></div></>}</form></div><aside className="space-y-4"><div className="surface bg-[hsl(var(--primary))] p-5 text-[hsl(var(--primary-foreground))]"><Info size={18} className="mb-6 text-[hsl(var(--secondary))]" /><div className="text-[11px] font-bold opacity-70">신청 전 확인</div><ul className="mt-3 space-y-3 text-[12px] font-semibold leading-5"><li>• 신청 후 관리자 승인까지 잠시 기다려 주세요.</li><li>• 승인 전에는 연차가 차감되지 않아요.</li><li>• 업무 인수인계 내용을 사유에 남겨 주세요.</li></ul></div><div className="surface p-5"><div className="mb-4 flex items-center gap-2 text-xs font-bold"><CalendarDays size={15} className="text-[hsl(var(--primary))]" />선택한 구성원 잔여</div>{selectedEmployee ? <><div className="font-mono text-3xl tracking-[-.08em]">{formatDays(selectedEmployee.remainingDays)}</div><div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">대기 중인 신청 {formatDays(selectedEmployee.pendingDays)}</div></> : <p className="text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">신청자를 선택하면 잔여 연차를 보여드릴게요.</p>}</div></aside></div></div>;
}

function calculateDays(start: string, end: string, type: keyof typeof LeaveType) {
  if (!start || !end) return 0;
  if (type === 'half_day') return 0.5;
  if (type === 'quarter_day' || type === 'early_leave' || type === 'outing') return 0.25;
  const difference = Math.round((new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 86400000) + 1;
  return Math.max(0, difference);
}
function ConfirmRow({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between px-4 py-3 text-xs"><span className="text-[hsl(var(--muted-foreground))]">{label}</span><span className="font-semibold">{value}</span></div>; }
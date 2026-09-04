import { useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, CalendarOff, CheckCircle2, Info } from 'lucide-react';
import { Link } from 'wouter';
import { useGetEmployees, useCreateAttendanceRecord, getGetDashboardSummaryQueryKey, getGetLeaveRequestsQueryKey, getGetEmployeesQueryKey, type AttendanceRecordType } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout';
import { ActionButton, QueryError, LoadingRows } from '@/components/ui-pieces';
import { formatDays } from '@/lib/leave';

const attendanceTypeLabels: Record<AttendanceRecordType, string> = {
  annual: '연차',
  public_leave: '공가',
  sick_leave: '병가',
  absence: '결근',
  attendance_other: '기타',
};

export default function AttendanceRecordPage() {
  const queryClient = useQueryClient();
  const employeesQuery = useGetEmployees();
  const createAttendanceRecord = useCreateAttendanceRecord();
  
  const [employeeId, setEmployeeId] = useState('');
  const [attendanceType, setAttendanceType] = useState<AttendanceRecordType>('public_leave');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  
  const employees = employeesQuery.data || [];
  const selectedEmployee = employees.find((employee) => String(employee.id) === employeeId);
  const days = useMemo(() => calculateDays(startDate, endDate), [startDate, endDate]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!employeeId || !startDate || !endDate || !reason.trim()) { 
      setError('대상자, 기간, 사유를 모두 입력해 주세요.'); 
      return; 
    }
    if (days < 0.5) { 
      setError('종료일은 시작일 이후로 선택해 주세요.'); 
      return; 
    }
    
    createAttendanceRecord.mutate({ 
      data: { 
        employeeId: Number(employeeId), 
        attendanceType,
        startDate, 
        endDate, 
        days, 
        reason: reason.trim() 
      },
    }, { 
      onSuccess: () => { 
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetLeaveRequestsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetEmployeesQueryKey() });
        setSubmitted(true); 
      },
      onError: (mutationError) => {
        setError(mutationError.message || '근태 기록을 저장하지 못했습니다.');
      },
    });
  };

  if (submitted) {
    return (
      <div>
        <PageHeader eyebrow="등록 완료" title="관리자 근태 등록이 완료되었습니다" />
        <div className="mx-auto max-w-[640px] px-5 py-12 sm:px-8 md:py-16">
          <div className="surface animate-rise p-8 text-center sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">
              <CheckCircle2 size={30} />
            </div>
            <h2 className="mt-6 text-xl font-extrabold tracking-[-.05em]">관리자 근태 등록 완료</h2>
            <p className="mt-2 text-[13px] text-[hsl(var(--muted-foreground))]">입력하신 일정이 현황에 반영되었습니다.</p>
            <div className="mx-auto mt-6 max-w-sm divide-y divide-[hsl(var(--border))] rounded-xl border border-[hsl(var(--border))] text-left">
              <ConfirmRow label="대상자" value={selectedEmployee?.name || employeeId} />
              <ConfirmRow label="신청 유형" value={attendanceTypeLabels[attendanceType]} />
              <ConfirmRow label="근태 기간" value={`${startDate} — ${endDate}`} />
              <ConfirmRow label="등록 일수" value={formatDays(days)} />
            </div>
            <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
              <Link href="/admin" data-testid="link-view-dashboard" className="inline-flex items-center justify-center rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))] hover:brightness-110">
                현황에서 확인
              </Link>
              <button type="button" onClick={() => { setSubmitted(false); setReason(''); setStartDate(''); setEndDate(''); }} data-testid="button-new-attendance-record" className="rounded-lg border border-[hsl(var(--border))] px-4 py-2.5 text-xs font-bold hover:bg-[hsl(var(--muted))]">
                추가 등록하기
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader 
        eyebrow="관리자 전용 · 관리자 근태 등록" 
        title="관리자 근태 등록" 
        description="관리자 권한으로 구성원의 근태(공가, 병가, 결근 등)를 대신 등록합니다." 
        action={
          <Link href="/admin" data-testid="link-back-dashboard" className="inline-flex items-center gap-2 text-[12px] font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]">
            <ArrowLeft size={15} />현황으로 돌아가기
          </Link>
        } 
      />
      
      <div className="mx-auto grid max-w-[1060px] gap-5 px-5 py-7 sm:px-8 md:grid-cols-[1fr_300px] md:py-10">
        <div className="surface p-5 sm:p-8">
          <form onSubmit={submit} data-testid="form-attendance-registration">
            <div className="mb-7">
              <div className="eyebrow mb-2">01 · 대상자 선택</div>
              <h2 className="text-lg font-extrabold tracking-[-.04em]">누구의 근태인가요?</h2>
            </div>
            
            {employeesQuery.isLoading && <LoadingRows count={2} />}
            {employeesQuery.isError && <QueryError onRetry={() => employeesQuery.refetch()} />}
            
            {!employeesQuery.isLoading && !employeesQuery.isError && (
              <>
                <label className="mb-8 block">
                  <span className="mb-2 block text-[11px] font-bold">대상 구성원</span>
                  <select 
                    value={employeeId} 
                    onChange={(event) => setEmployeeId(event.target.value)} 
                    data-testid="select-employee" 
                    className="h-11 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring)/.1)]"
                  >
                    <option value="">대상자를 선택해 주세요</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name} · {employee.department}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mb-8 block">
                  <span className="mb-2 block text-[11px] font-bold">신청 유형</span>
                  <select
                    value={attendanceType}
                    onChange={(event) => setAttendanceType(event.target.value as AttendanceRecordType)}
                    data-testid="select-attendance-type"
                    className="h-11 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring)/.1)]"
                  >
                    {Object.entries(attendanceTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <div className="mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">
                    {attendanceType === 'annual'
                      ? '연차로 등록하면 대상 구성원의 잔여 연차에서 차감됩니다.'
                      : attendanceType === 'absence'
                        ? '결근은 근태 기록으로 저장되며, 입사 1년 미만 구성원은 기존 규칙에 따라 연차에서 차감됩니다.'
                        : '선택한 근태는 기록만 남고 잔여 연차에서 차감되지 않습니다.'}
                  </div>
                </label>
                
                <div className="mb-8">
                  <div className="eyebrow mb-2">02 · 일정 선택</div>
                  <h2 className="mb-4 text-lg font-extrabold tracking-[-.04em]">언제 근태에 반영하나요?</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label>
                      <span className="mb-2 block text-[11px] font-bold">시작일</span>
                      <input 
                        type="date" 
                        value={startDate} 
                        onChange={(event) => setStartDate(event.target.value)} 
                        data-testid="input-start-date" 
                        className="h-11 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring)/.1)]" 
                      />
                    </label>
                    <label>
                      <span className="mb-2 block text-[11px] font-bold">종료일</span>
                      <input 
                        type="date" 
                        min={startDate} 
                        value={endDate} 
                        onChange={(event) => setEndDate(event.target.value)} 
                        data-testid="input-end-date" 
                        className="h-11 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring)/.1)]" 
                      />
                    </label>
                  </div>
                </div>
                
                <div className="mb-7">
                  <div className="eyebrow mb-2">03 · 사유 기록</div>
                  <h2 className="mb-4 text-lg font-extrabold tracking-[-.04em]">등록 사유를 남겨주세요</h2>
                  <textarea 
                    value={reason} 
                    onChange={(event) => setReason(event.target.value)} 
                    data-testid="textarea-attendance-reason" 
                    placeholder="근태 등록 사유 (예: 공가, 병가, 외부 교육 참석, 결근 등)를 명확히 적어 주세요." 
                    className="min-h-[112px] w-full resize-y rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] p-3 text-xs leading-6 outline-none focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring)/.1)]" 
                  />
                </div>
                
                {error && (
                  <div data-testid="form-error" className="mb-4 rounded-lg bg-[hsl(var(--destructive)/.1)] border border-[hsl(var(--destructive-border))] px-3 py-2.5 text-xs font-semibold text-[hsl(var(--destructive))]">
                    {error}
                  </div>
                )}
                
                <div className="flex items-center justify-between gap-4 border-t border-[hsl(var(--border))] pt-5">
                  <div className="text-[11px] text-[hsl(var(--muted-foreground))]">
                    <span className="font-mono text-lg text-[hsl(var(--foreground))]">{days > 0 ? formatDays(days) : '—'}</span>
                    <span className="ml-2">등록 예정</span>
                  </div>
                  <ActionButton 
                    testId="button-submit-attendance-registration" 
                    onClick={() => { 
                      const form = document.querySelector<HTMLFormElement>('[data-testid="form-attendance-registration"]'); 
                      form?.requestSubmit(); 
                    }} 
                    disabled={createAttendanceRecord.isPending}
                  >
                    관리자 근태 등록
                  </ActionButton>
                </div>
              </>
            )}
          </form>
        </div>
        
        <aside className="space-y-4">
          <div className="surface bg-[hsl(var(--primary))] p-5 text-[hsl(var(--primary-foreground))]">
            <Info size={18} className="mb-6 text-[hsl(var(--secondary))]" />
            <div className="text-[11px] font-bold opacity-70">관리자 근태 등록 안내</div>
            <ul className="mt-3 space-y-3 text-[12px] font-semibold leading-5">
              <li>• 구성원이 개인 연차를 사용하는 것이 아닌, 공가·병가·결근 등 기타 사유로 근태에 반영이 필요한 경우 관리자가 직접 등록하는 기능입니다.</li>
              <li>• 입사 1년 미만 구성원의 결근은 결근일만큼 연차에서 차감됩니다.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function calculateDays(start: string, end: string) {
  if (!start || !end) return 0;
  const difference = Math.round((new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 86400000) + 1;
  return Math.max(0, difference);
}

function ConfirmRow({ label, value }: { label: string; value: string }) { 
  return (
    <div className="flex items-center justify-between px-4 py-3 text-xs">
      <span className="text-[hsl(var(--muted-foreground))]">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  ); 
}
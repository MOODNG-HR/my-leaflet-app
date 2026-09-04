import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, UserX, AlertTriangle } from 'lucide-react';
import { Link, useLocation, useParams } from 'wouter';
import { useGetAdminEmployee, getGetAdminEmployeeQueryKey, useUpdateAdminEmployee, useResignAdminEmployee, getGetAdminEmployeesQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout';
import { ActionButton, QueryError, LoadingRows } from '@/components/ui-pieces';

export default function AdminEmployeeDetailPage() {
  const { id } = useParams();
  const employeeId = Number(id);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const query = useGetAdminEmployee(employeeId, {
    query: { queryKey: getGetAdminEmployeeQueryKey(employeeId) }
  });
  const updateMutation = useUpdateAdminEmployee();
  const resignMutation = useResignAdminEmployee();

  const [form, setForm] = useState({
    employeeNumber: '',
    name: '',
    email: '',
    department: '',
    position: '',
    joinedAt: '',
    ordinaryHourlyWage: '',
    role: '직원' as '직원' | '관리자',
  });
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [resignConfirmOpen, setResignConfirmOpen] = useState(false);
  const [resignedAt, setResignedAt] = useState(new Date().toISOString().split('T')[0]);

  const initializedForId = useRef<number | null>(null);

  useEffect(() => {
    if (query.data && initializedForId.current !== employeeId) {
      initializedForId.current = employeeId;
      const d = query.data;
      setForm({
        employeeNumber: d.employeeNumber || '',
        name: d.name || '',
        email: d.email || '',
        department: d.department || '',
        position: d.position || '',
        joinedAt: d.joinedAt || '',
        ordinaryHourlyWage: String(d.ordinaryHourlyWage || 0),
        role: d.role as '직원' | '관리자',
      });
    }
  }, [query.data, employeeId]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccessMsg('');
    
    if (!form.employeeNumber || !form.name || !form.email || !form.department || !form.position || !form.joinedAt || !form.ordinaryHourlyWage) {
      setError('모든 필드를 입력해 주세요.');
      return;
    }

    updateMutation.mutate({
      id: employeeId,
      data: {
        ...form,
        ordinaryHourlyWage: Number(form.ordinaryHourlyWage),
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAdminEmployeeQueryKey(employeeId) });
        queryClient.invalidateQueries({ queryKey: getGetAdminEmployeesQueryKey() });
        setSuccessMsg('정보가 성공적으로 수정되었습니다.');
        window.setTimeout(() => setSuccessMsg(''), 3000);
      },
      onError: (err) => {
        setError(err.message || '수정에 실패했습니다.');
      }
    });
  };

  const handleResign = () => {
    setError('');
    resignMutation.mutate({
      id: employeeId,
      data: { resignedAt }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAdminEmployeeQueryKey(employeeId) });
        queryClient.invalidateQueries({ queryKey: getGetAdminEmployeesQueryKey() });
        setResignConfirmOpen(false);
        setSuccessMsg('퇴사 처리가 완료되었습니다.');
        window.setTimeout(() => setSuccessMsg(''), 3000);
      },
      onError: (err) => {
        setError(err.message || '퇴사 처리에 실패했습니다.');
      }
    });
  };

  if (query.isLoading) {
    return <div className="p-10"><LoadingRows count={5} /></div>;
  }
  if (query.isError) {
    return <div className="p-10"><QueryError onRetry={() => query.refetch()} /></div>;
  }
  if (!query.data) return null;

  const isResigned = query.data.status === 'resigned';

  return (
    <div>
      <PageHeader 
        eyebrow="구성원 상세" 
        title={query.data.name} 
        description="인사 정보 수정 및 퇴사 처리를 진행할 수 있습니다."
        action={
          <Link href="/admin/employees" data-testid="link-back-employees" className="inline-flex items-center gap-2 text-[12px] font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]">
            <ArrowLeft size={15} />목록으로 돌아가기
          </Link>
        }
      />
      <div className="mx-auto max-w-[800px] px-5 py-7 sm:px-8 md:px-10 md:py-9">
        
        {successMsg && <div className="mb-5 rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-3 text-[12px] font-semibold text-green-700 dark:text-green-400">{successMsg}</div>}
        {isResigned && (
          <div className="mb-6 rounded-lg bg-[hsl(var(--muted)/.6)] border border-[hsl(var(--border))] p-5 flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
              <UserX size={20} />
            </div>
            <div>
              <div className="text-sm font-bold">퇴사자입니다</div>
              <div className="mt-1 text-[12px] text-[hsl(var(--muted-foreground))]">{query.data.resignedAt} 일자로 퇴사 처리되었습니다. 시스템 접근이 제한됩니다.</div>
            </div>
          </div>
        )}

        <form onSubmit={submit} className="surface p-6 sm:p-8">
          <div className="mb-8 border-b border-[hsl(var(--border))] pb-6">
            <h2 className="text-sm font-extrabold">기본 정보</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-[11px] font-bold">사번</span>
                <input type="text" disabled={isResigned} value={form.employeeNumber} onChange={e => setForm({...form, employeeNumber: e.target.value})} className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring)/.1)] disabled:opacity-50" />
              </label>
              <label>
                <span className="mb-2 block text-[11px] font-bold">이름</span>
                <input type="text" disabled={isResigned} value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring)/.1)] disabled:opacity-50" />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-2 block text-[11px] font-bold">회사 이메일</span>
                <input type="email" disabled={isResigned} value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring)/.1)] disabled:opacity-50" />
              </label>
            </div>
          </div>

          <div className="mb-8 border-b border-[hsl(var(--border))] pb-6">
            <h2 className="text-sm font-extrabold">조직 및 직무</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-[11px] font-bold">부서</span>
                <input type="text" disabled={isResigned} value={form.department} onChange={e => setForm({...form, department: e.target.value})} className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring)/.1)] disabled:opacity-50" />
              </label>
              <label>
                <span className="mb-2 block text-[11px] font-bold">직위/직급</span>
                <input type="text" disabled={isResigned} value={form.position} onChange={e => setForm({...form, position: e.target.value})} className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring)/.1)] disabled:opacity-50" />
              </label>
              <label>
                <span className="mb-2 block text-[11px] font-bold">입사일</span>
                <input type="date" disabled={isResigned} value={form.joinedAt} onChange={e => setForm({...form, joinedAt: e.target.value})} className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring)/.1)] disabled:opacity-50" />
              </label>
              <label>
                <span className="mb-2 block text-[11px] font-bold">통상시급 (원)</span>
                <input type="number" min="0" disabled={isResigned} value={form.ordinaryHourlyWage} onChange={e => setForm({...form, ordinaryHourlyWage: e.target.value})} className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring)/.1)] disabled:opacity-50" />
              </label>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-sm font-extrabold">시스템 권한</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button type="button" disabled={isResigned} onClick={() => setForm({...form, role: '직원'})} className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${form.role === '직원' ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.05)] ring-1 ring-[hsl(var(--primary))]' : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'} disabled:opacity-50`}>
                <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${form.role === '직원' ? 'border-[hsl(var(--primary))]' : 'border-[hsl(var(--muted-foreground))]'}`}>
                  {form.role === '직원' && <div className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" />}
                </div>
                <div>
                  <div className="text-[12px] font-bold">일반 직원</div>
                </div>
              </button>
              <button type="button" disabled={isResigned} onClick={() => setForm({...form, role: '관리자'})} className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${form.role === '관리자' ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.05)] ring-1 ring-[hsl(var(--primary))]' : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'} disabled:opacity-50`}>
                <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${form.role === '관리자' ? 'border-[hsl(var(--primary))]' : 'border-[hsl(var(--muted-foreground))]'}`}>
                  {form.role === '관리자' && <div className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" />}
                </div>
                <div>
                  <div className="text-[12px] font-bold">관리자</div>
                </div>
              </button>
            </div>
          </div>

          {error && !resignConfirmOpen && <div className="mb-6 rounded-lg bg-[hsl(var(--destructive)/.1)] border border-[hsl(var(--destructive-border))] px-4 py-3 text-[12px] font-semibold text-[hsl(var(--destructive))]">{error}</div>}

          {!isResigned && (
            <div className="flex justify-between items-center pt-6 border-t border-[hsl(var(--border))]">
              <button type="button" onClick={() => setResignConfirmOpen(true)} className="text-[12px] font-bold text-[hsl(var(--destructive))] hover:brightness-110 px-2 py-1">
                퇴사 처리
              </button>
              <div className="flex gap-3">
                <Link href="/admin/employees" className="inline-flex h-10 items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-5 text-xs font-bold transition-colors hover:bg-[hsl(var(--muted))]">취소</Link>
                <ActionButton testId="button-submit-edit-employee" onClick={() => { const form = document.querySelector<HTMLFormElement>('form'); form?.requestSubmit(); }} disabled={updateMutation.isPending}>저장하기</ActionButton>
              </div>
            </div>
          )}
        </form>
      </div>

      {resignConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(var(--foreground)/.32)] p-4">
          <div className="w-full max-w-[400px] rounded-xl bg-[hsl(var(--card))] p-6 shadow-2xl animate-rise border border-[hsl(var(--border))]">
            <div className="flex items-center gap-3 text-[hsl(var(--destructive))] mb-4">
              <AlertTriangle size={24} />
              <h2 className="text-lg font-extrabold tracking-[-.04em]">퇴사 처리 확인</h2>
            </div>
            <p className="text-[13px] text-[hsl(var(--muted-foreground))] mb-6 leading-relaxed">
              <strong>{query.data.name}</strong> 님을 정말 퇴사 처리하시겠습니까?<br />
              퇴사 시 시스템 로그인이 차단되며 연차 부여가 중단됩니다.
            </p>
            <label className="block mb-6">
              <span className="block mb-2 text-[11px] font-bold text-[hsl(var(--foreground))]">퇴사 일자</span>
              <input type="date" value={resignedAt} onChange={e => setResignedAt(e.target.value)} className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring)/.1)]" />
            </label>
            {error && resignConfirmOpen && <div className="mb-6 rounded-lg bg-[hsl(var(--destructive)/.1)] border border-[hsl(var(--destructive-border))] px-4 py-3 text-[12px] font-semibold text-[hsl(var(--destructive))]">{error}</div>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setResignConfirmOpen(false)} className="rounded-lg px-4 py-2.5 text-xs font-bold hover:bg-[hsl(var(--muted))]">취소</button>
              <ActionButton testId="button-submit-resign-employee" kind="danger" disabled={resignMutation.isPending} onClick={handleResign}>퇴사 확정</ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
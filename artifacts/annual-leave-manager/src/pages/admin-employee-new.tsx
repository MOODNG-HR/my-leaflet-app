import { useState, type FormEvent } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useCreateAdminEmployee, getGetAdminEmployeesQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout';
import { ActionButton } from '@/components/ui-pieces';

export default function AdminEmployeeNewPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const createMutation = useCreateAdminEmployee();

  const [form, setForm] = useState({
    employeeNumber: '',
    name: '',
    email: '',
    department: '',
    position: '',
    joinedAt: new Date().toISOString().split('T')[0],
    ordinaryHourlyWage: '',
    role: '직원' as '직원' | '관리자',
  });
  const [error, setError] = useState('');

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    
    if (!form.employeeNumber || !form.name || !form.email || !form.department || !form.position || !form.joinedAt || !form.ordinaryHourlyWage) {
      setError('모든 필드를 입력해 주세요.');
      return;
    }

    createMutation.mutate({
      data: {
        ...form,
        ordinaryHourlyWage: Number(form.ordinaryHourlyWage),
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAdminEmployeesQueryKey() });
        setLocation('/admin/employees');
      },
      onError: (err) => {
        setError(err.message || '구성원 등록에 실패했습니다.');
      }
    });
  };

  return (
    <div>
      <PageHeader 
        eyebrow="구성원 관리" 
        title="새 구성원 등록" 
        description="신규 입사자의 인사 정보와 계정 권한을 사전 등록합니다."
        action={
          <Link href="/admin/employees" data-testid="link-back-employees" className="inline-flex items-center gap-2 text-[12px] font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]">
            <ArrowLeft size={15} />목록으로 돌아가기
          </Link>
        }
      />
      <div className="mx-auto max-w-[800px] px-5 py-7 sm:px-8 md:px-10 md:py-9">
        <form onSubmit={submit} className="surface p-6 sm:p-8">
          <div className="mb-8 border-b border-[hsl(var(--border))] pb-6">
            <h2 className="text-sm font-extrabold">기본 정보</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-[11px] font-bold">사번</span>
                <input type="text" value={form.employeeNumber} onChange={e => setForm({...form, employeeNumber: e.target.value})} className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring)/.1)]" placeholder="예: 2024001" />
              </label>
              <label>
                <span className="mb-2 block text-[11px] font-bold">이름</span>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring)/.1)]" placeholder="실명 입력" />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-2 block text-[11px] font-bold">회사 이메일</span>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring)/.1)]" placeholder="로그인에 사용할 이메일" />
              </label>
            </div>
          </div>

          <div className="mb-8 border-b border-[hsl(var(--border))] pb-6">
            <h2 className="text-sm font-extrabold">조직 및 직무</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-[11px] font-bold">부서</span>
                <input type="text" value={form.department} onChange={e => setForm({...form, department: e.target.value})} className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring)/.1)]" placeholder="소속 부서" />
              </label>
              <label>
                <span className="mb-2 block text-[11px] font-bold">직위/직급</span>
                <input type="text" value={form.position} onChange={e => setForm({...form, position: e.target.value})} className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring)/.1)]" placeholder="예: 선임, 매니저" />
              </label>
              <label>
                <span className="mb-2 block text-[11px] font-bold">입사일</span>
                <input type="date" value={form.joinedAt} onChange={e => setForm({...form, joinedAt: e.target.value})} className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring)/.1)]" />
              </label>
              <label>
                <span className="mb-2 block text-[11px] font-bold">통상시급 (원)</span>
                <input type="number" min="0" value={form.ordinaryHourlyWage} onChange={e => setForm({...form, ordinaryHourlyWage: e.target.value})} className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring)/.1)]" placeholder="연차 수당 계산용" />
              </label>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-sm font-extrabold">시스템 권한</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setForm({...form, role: '직원'})} className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${form.role === '직원' ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.05)] ring-1 ring-[hsl(var(--primary))]' : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'}`}>
                <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${form.role === '직원' ? 'border-[hsl(var(--primary))]' : 'border-[hsl(var(--muted-foreground))]'}`}>
                  {form.role === '직원' && <div className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" />}
                </div>
                <div>
                  <div className="text-[12px] font-bold">일반 직원</div>
                  <div className="mt-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">자신의 휴가만 신청 및 조회 가능</div>
                </div>
              </button>
              <button type="button" onClick={() => setForm({...form, role: '관리자'})} className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${form.role === '관리자' ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.05)] ring-1 ring-[hsl(var(--primary))]' : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'}`}>
                <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${form.role === '관리자' ? 'border-[hsl(var(--primary))]' : 'border-[hsl(var(--muted-foreground))]'}`}>
                  {form.role === '관리자' && <div className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" />}
                </div>
                <div>
                  <div className="text-[12px] font-bold">관리자</div>
                  <div className="mt-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">모든 직원의 휴가 승인 및 설정 관리</div>
                </div>
              </button>
            </div>
          </div>

          {error && <div className="mb-6 rounded-lg bg-[hsl(var(--destructive)/.1)] border border-[hsl(var(--destructive-border))] px-4 py-3 text-[12px] font-semibold text-[hsl(var(--destructive))]">{error}</div>}

          <div className="flex justify-end gap-3 pt-6 border-t border-[hsl(var(--border))]">
            <Link href="/admin/employees" className="inline-flex h-10 items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-5 text-xs font-bold transition-colors hover:bg-[hsl(var(--muted))]">취소</Link>
            <ActionButton testId="button-submit-new-employee" onClick={() => { const form = document.querySelector<HTMLFormElement>('form'); form?.requestSubmit(); }} disabled={createMutation.isPending}>등록하기</ActionButton>
          </div>
        </form>
      </div>
    </div>
  );
}
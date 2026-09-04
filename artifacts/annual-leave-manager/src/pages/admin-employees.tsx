import { useState } from 'react';
import { BriefcaseBusiness, ChevronRight, Plus, Search, UserMinus } from 'lucide-react';
import { useGetAdminEmployees, type Employee } from '@workspace/api-client-react';
import { PageHeader } from '@/components/layout';
import { Avatar, EmptyState, LoadingRows, QueryError, StatusBadge } from '@/components/ui-pieces';
import { formatShortDate } from '@/lib/leave';
import { Link, useLocation } from 'wouter';

export default function AdminEmployeesPage() {
  const [search, setSearch] = useState('');
  const [, setLocation] = useLocation();
  const query = useGetAdminEmployees(search ? { search } : undefined);

  return (
    <div>
      <PageHeader 
        eyebrow="관리자 전용" 
        title="구성원 관리" 
        description="전체 임직원의 인사 정보와 계정 상태를 관리합니다." 
        action={
          <Link href="/admin/employees/new" data-testid="link-new-employee" className="inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-[12px] font-bold text-[hsl(var(--primary-foreground))] transition hover:brightness-110">
            <Plus size={15} />구성원 등록
          </Link>
        } 
      />
      <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 md:px-10 md:py-9">
        <div className="mb-5 flex items-center justify-between">
          <div className="relative w-full max-w-[320px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="이름, 사번, 부서, 직무 검색" data-testid="input-search-employees" className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] pl-9 pr-3 text-[12px] outline-none transition focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring)/.12)]" />
          </div>
          <div className="hidden items-center gap-3 text-[11px] font-semibold text-[hsl(var(--muted-foreground))] sm:flex">
            <div className="flex items-center gap-1.5"><BriefcaseBusiness size={14} className="text-[hsl(var(--primary))]" />{query.data?.filter(e => e.status === 'active').length || 0}명 재직 중</div>
          </div>
        </div>
        <div className="surface overflow-hidden">
          <div className="hidden grid-cols-[1.5fr_1fr_1fr_1fr_1fr_.5fr] border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/.45)] px-5 py-3 text-[10px] font-bold text-[hsl(var(--muted-foreground))] xl:grid">
            <span>구성원</span>
            <span>사번 / 이메일</span>
            <span>조직 / 직무</span>
            <span>권한</span>
            <span>상태 / 입사일</span>
            <span className="text-right">관리</span>
          </div>
          {query.isLoading && <div className="p-4"><LoadingRows count={5} /></div>}
          {query.isError && <div className="p-5"><QueryError onRetry={() => query.refetch()} /></div>}
          {!query.isLoading && !query.isError && !query.data?.length && <div className="p-5"><EmptyState title="검색 결과가 없어요" description="다른 검색어로 시도해 보세요." /></div>}
          {query.data?.map((employee, index) => <EmployeeRow employee={employee} key={employee.id} index={index} onClick={() => setLocation(`/admin/employees/${employee.id}`)} />)}
        </div>
      </div>
    </div>
  );
}

function EmployeeRow({ employee, index, onClick }: { employee: Employee; index: number; onClick: () => void }) {
  const colors = ['teal', 'peach', 'gold', 'sage'] as const;
  const isResigned = employee.status === 'resigned';
  return (
    <button type="button" onClick={onClick} data-testid={`row-employee-${employee.id}`} className={`grid w-full grid-cols-1 gap-3 border-b border-[hsl(var(--border))] px-4 py-4 text-left transition-colors last:border-0 hover:bg-[hsl(var(--muted)/.35)] xl:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_.5fr] xl:items-center xl:px-5 xl:py-4 ${isResigned ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-3">
        <Avatar name={employee.name} color={colors[index % colors.length]} />
        <div>
          <div className="flex items-center gap-2 text-[12px] font-bold">
            {employee.name}
            {employee.role === '관리자' && <span className="rounded bg-[hsl(var(--primary)/.15)] px-1.5 py-0.5 text-[9px] font-bold text-[hsl(var(--primary))]">ADMIN</span>}
          </div>
          <div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))] xl:hidden">{employee.employeeNumber} · {employee.department}</div>
        </div>
      </div>
      
      <div className="pl-12 text-[11px] xl:pl-0">
        <div className="font-mono font-medium">{employee.employeeNumber || '—'}</div>
        <div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{employee.email || '미등록'}</div>
      </div>

      <div className="pl-12 text-[11px] xl:pl-0">
        <div className="font-medium">{employee.department}</div>
        <div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{employee.position}</div>
      </div>

      <div className="pl-12 text-[11px] font-medium xl:pl-0">
        {employee.role}
      </div>

      <div className="flex items-center justify-between pl-12 xl:block xl:pl-0">
        <div className="flex items-center gap-2">
          {isResigned ? (
            <span className="inline-flex items-center gap-1 rounded bg-[hsl(var(--muted))] px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--muted-foreground))]">
              <UserMinus size={10} />퇴사
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded bg-green-500/10 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:text-green-400">
              <span className="h-1.5 w-1.5 rounded-full bg-current" />재직
            </span>
          )}
        </div>
        <div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))] xl:block hidden">
          {formatShortDate(employee.joinedAt)} 입사
        </div>
        <div className="text-[10px] text-[hsl(var(--muted-foreground))] xl:hidden">
          상세 보기 <ChevronRight size={12} className="inline" />
        </div>
      </div>

      <div className="hidden text-right xl:block">
        <ChevronRight size={16} className="ml-auto text-[hsl(var(--muted-foreground))]" />
      </div>
    </button>
  );
}
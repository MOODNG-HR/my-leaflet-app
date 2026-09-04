import { useState } from 'react';
import { Check, ChevronRight, Filter, Search, X } from 'lucide-react';
import { useGetLeaveRequest, useGetLeaveRequests, type LeaveRequest, type LeaveRequestStatus } from '@workspace/api-client-react';
import { useLocation } from 'wouter';
import { PageHeader } from '@/components/layout';
import { ActionButton, Avatar, EmptyState, LoadingRows, QueryError, StatusBadge } from '@/components/ui-pieces';
import { formatDate, formatDays, formatShortDate, leaveTypeLabels } from '@/lib/leave';
import { useLeaveActions } from '@/hooks/use-leave-actions';

const filters: { value: 'all' | LeaveRequestStatus; label: string }[] = [
  { value: 'all', label: '전체' }, { value: 'pending', label: '승인 대기' }, { value: 'approved', label: '승인 완료' }, { value: 'rejected', label: '반려' },
];

export default function RequestsPage() {
  const [location] = useLocation();
  const [search, setSearch] = useState('');
  const initialStatus = new URLSearchParams(location.split('?')[1] || '').get('status');
  const [status, setStatus] = useState<'all' | LeaveRequestStatus>(initialStatus === 'pending' ? 'pending' : 'all');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const params = { ...(search ? { search } : {}), ...(status !== 'all' ? { status } : {}) };
  const query = useGetLeaveRequests(params);
  const actions = useLeaveActions();
  const [notice, setNotice] = useState<string | null>(null);

  const processRequest = (id: number, nextStatus: 'approved' | 'rejected', rejectionReason?: string) => {
    actions.updateRequestStatus.mutate({ id, data: { status: nextStatus, rejectionReason: rejectionReason || null } }, {
      onSuccess: () => { actions.refreshLeaveData(); setSelectedId(null); setNotice(nextStatus === 'approved' ? '휴가 신청을 승인했어요.' : '휴가 신청을 반려했어요.'); window.setTimeout(() => setNotice(null), 2800); },
    });
  };

  return (
    <div>
      <PageHeader eyebrow="휴가 신청 · 승인 대기" title="승인함" description="구성원의 휴가 신청을 검토하고 처리하세요." action={<div className="hidden items-center gap-2 sm:flex"><span className="h-2 w-2 rounded-full bg-[hsl(var(--accent))]" /><span className="text-[12px] font-semibold">{query.data?.filter((request) => request.status === 'pending').length || 0}건 대기 중</span></div>} />
      <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 md:px-10 md:py-9">
        {notice && <div data-testid="status-success-notice" className="mb-5 flex items-center gap-2 rounded-xl border border-[hsl(var(--secondary))] bg-[hsl(var(--secondary)/.3)] px-4 py-3 text-[12px] font-bold text-[hsl(var(--foreground))]"><Check size={16} />{notice}</div>}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-[300px]"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="이름 또는 부서 검색" data-testid="input-search-requests" className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] pl-9 pr-3 text-[12px] outline-none transition focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring)/.12)]" /></div>
          <div className="mobile-scroll flex gap-1 rounded-lg bg-[hsl(var(--muted)/.7)] p-1">{filters.map((filter) => <button type="button" key={filter.value} onClick={() => setStatus(filter.value)} data-testid={`button-filter-${filter.value}`} className={`shrink-0 rounded-md px-3 py-1.5 text-[11px] font-bold transition-colors ${status === filter.value ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`}><Filter size={12} className="mr-1 inline-block" />{filter.label}</button>)}</div>
        </div>
        <div className="surface overflow-hidden">
          <div className="hidden grid-cols-[1.35fr_1fr_.7fr_.7fr_1.1fr] border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/.45)] px-5 py-3 text-[10px] font-bold text-[hsl(var(--muted-foreground))] md:grid"><span>신청자</span><span>휴가 일정</span><span>종류</span><span>일수</span><span>상태 / 처리</span></div>
          {query.isLoading && <div className="p-4"><LoadingRows /></div>}
          {query.isError && <div className="p-5"><QueryError onRetry={() => query.refetch()} /></div>}
          {!query.isLoading && !query.isError && !query.data?.length && <div className="p-5"><EmptyState title="조건에 맞는 신청이 없어요" description="검색어 또는 상태 필터를 바꾸어 다시 확인해 보세요." /></div>}
          {!query.isLoading && !query.isError && query.data?.map((request) => <RequestRow key={request.id} request={request} onOpen={() => setSelectedId(request.id)} onApprove={() => processRequest(request.id, 'approved')} onReject={() => setSelectedId(request.id)} busy={actions.updateRequestStatus.isPending} />)}
        </div>
        <div className="mt-4 flex items-center justify-between text-[10px] text-[hsl(var(--muted-foreground))]"><span>총 {query.data?.length || 0}건</span><span className="font-mono">마지막 동기화 · 방금 전</span></div>
      </div>
      {selectedId !== null && <RequestDrawer id={selectedId} onClose={() => setSelectedId(null)} onProcess={processRequest} processing={actions.updateRequestStatus.isPending} />}
    </div>
  );
}

function RequestRow({ request, onOpen, onApprove, onReject, busy }: { request: LeaveRequest; onOpen: () => void; onApprove: () => void; onReject: () => void; busy: boolean }) {
  const isPending = request.status === 'pending';
  return <div data-testid={`row-request-${request.id}`} className="group grid cursor-pointer grid-cols-1 gap-3 border-b border-[hsl(var(--border))] px-4 py-4 transition-colors last:border-0 hover:bg-[hsl(var(--muted)/.35)] md:grid-cols-[1.35fr_1fr_.7fr_.7fr_1.1fr] md:items-center md:px-5 md:py-3.5" onClick={onOpen}>
    <div className="flex items-center gap-3"><Avatar name={request.employeeName} color={request.id % 3 === 0 ? 'gold' : request.id % 2 ? 'teal' : 'peach'} /><div><div className="flex items-center gap-2 text-[12px] font-bold">{request.employeeName}<span className="text-[10px] font-normal text-[hsl(var(--muted-foreground))]">{request.department}</span>{request.recordSource === 'admin_attendance' && <span className="rounded border border-[hsl(var(--primary)/.35)] bg-[hsl(var(--primary)/.08)] px-1.5 py-0.5 text-[9px] text-[hsl(var(--primary))]">관리자 등록</span>}</div><div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">신청일 {formatShortDate(request.createdAt)}</div></div><ChevronRight size={15} className="ml-auto text-[hsl(var(--muted-foreground))] md:hidden" /></div>
    <div className="pl-12 text-[11px] md:pl-0"><span>{formatDate(request.startDate)}</span><span className="mx-1.5 text-[hsl(var(--muted-foreground))]">—</span><span>{formatDate(request.endDate)}</span></div>
    <div className="pl-12 text-[11px] font-semibold md:pl-0">{leaveTypeLabels[request.leaveType]}</div>
    <div className="pl-12 font-mono text-[12px] md:pl-0">{formatDays(request.days)}</div>
    <div className="flex items-center justify-between pl-12 md:pl-0">{isPending ? <div className="flex gap-1.5" onClick={(event) => event.stopPropagation()}><ActionButton testId={`button-approve-${request.id}`} onClick={onApprove} disabled={busy}>승인</ActionButton><ActionButton testId={`button-reject-${request.id}`} onClick={onReject} kind="danger" disabled={busy}>반려</ActionButton></div> : <StatusBadge status={request.status} />}<span className="hidden text-[10px] text-[hsl(var(--muted-foreground))] md:inline">상세 <ChevronRight size={13} className="inline" /></span></div>
  </div>;
}

function RequestDrawer({ id, onClose, onProcess, processing }: { id: number; onClose: () => void; onProcess: (id: number, status: 'approved' | 'rejected', reason?: string) => void; processing: boolean }) {
  const query = useGetLeaveRequest(id);
  const [reason, setReason] = useState('');
  const request = query.data;
  return <div className="fixed inset-0 z-50 flex justify-end bg-[hsl(var(--foreground)/.32)]" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><aside className="h-full w-full max-w-[440px] overflow-y-auto bg-[hsl(var(--card))] p-6 shadow-2xl sm:p-8" data-testid="request-detail-drawer"><div className="mb-8 flex items-center justify-between"><div><div className="eyebrow mb-2">신청 상세</div><h2 className="text-xl font-extrabold tracking-[-.05em]">휴가 신청 상세</h2></div><button type="button" onClick={onClose} data-testid="button-close-request-drawer" className="rounded-lg p-2 hover:bg-[hsl(var(--muted))]"><X size={19} /></button></div>
    {query.isLoading && <LoadingRows count={3} />}{query.isError && <QueryError onRetry={() => query.refetch()} />}{request && <div className="animate-rise"><div className="mb-6 flex items-center gap-3 rounded-xl bg-[hsl(var(--muted)/.6)] p-4"><Avatar name={request.employeeName} color="teal" /><div><div className="text-sm font-bold">{request.employeeName}</div><div className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">{request.department}</div></div><div className="ml-auto"><StatusBadge status={request.status} /></div></div><div className="divide-y divide-[hsl(var(--border))] rounded-xl border border-[hsl(var(--border))]"><Detail label="휴가 종류" value={leaveTypeLabels[request.leaveType]} /><Detail label="사용 기간" value={`${formatDate(request.startDate)} — ${formatDate(request.endDate)}`} /><Detail label="사용 일수" value={formatDays(request.days)} /><Detail label="신청일" value={formatShortDate(request.createdAt)} /><Detail label="사유" value={request.reason} /></div>{request.status === 'pending' && <div className="mt-7"><div className="mb-3 text-xs font-bold">이 신청을 어떻게 처리할까요?</div><div className="grid grid-cols-2 gap-2"><ActionButton testId={`button-drawer-approve-${id}`} onClick={() => onProcess(id, 'approved')} disabled={processing}>승인하기</ActionButton><ActionButton testId={`button-drawer-reject-${id}`} onClick={() => onProcess(id, 'rejected', reason)} kind="danger" disabled={processing}>반려하기</ActionButton></div><textarea value={reason} onChange={(event) => setReason(event.target.value)} data-testid="textarea-rejection-reason" placeholder="반려 시 사유를 남겨주세요 (선택)" className="mt-3 min-h-[80px] w-full resize-none rounded-lg border border-[hsl(var(--input))] bg-transparent p-3 text-xs outline-none focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring)/.1)]" /></div>}{request.status === 'rejected' && request.rejectionReason && <div className="mt-5 rounded-xl border border-[hsl(var(--destructive-border))] bg-[hsl(var(--destructive)/.1)] p-4 text-xs text-[hsl(var(--destructive))]"><div className="mb-1 font-bold">반려 사유</div>{request.rejectionReason}</div>}</div>}</aside></div>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div className="grid grid-cols-[75px_1fr] gap-4 px-4 py-3.5 text-xs"><span className="text-[hsl(var(--muted-foreground))]">{label}</span><span className="font-semibold leading-5">{value}</span></div>; }
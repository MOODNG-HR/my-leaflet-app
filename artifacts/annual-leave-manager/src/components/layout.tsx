import { useState, type ReactNode } from 'react';
import { CalendarDays, CalendarOff, ChevronRight, ClipboardCheck, LayoutDashboard, LogOut, Menu, User, Users, X } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useClerk, useUser } from '@clerk/react';
import { getGetMyEmployeeQueryKey, useGetMyEmployee } from '@workspace/api-client-react';
import { Avatar } from './ui-pieces';

const navItems = [
  { href: '/', label: '오늘의 현황', icon: LayoutDashboard },
  { href: '/requests', label: '승인함', icon: ClipboardCheck },
  { href: '/employees', label: '구성원', icon: Users },
  { href: '/my-leave', label: '나의 휴가', icon: CalendarDays },
  { href: '/absence', label: '부재 등록', icon: CalendarOff },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const activePath = location === '/' ? '/' : `/${location.split('/')[1]}`;
  const { user } = useUser();
  const { signOut } = useClerk();
  const profile = useGetMyEmployee({
    query: { queryKey: getGetMyEmployeeQueryKey(), retry: false },
  }).data;

  const userName = profile?.name || user?.firstName || user?.fullName || user?.username || '사용자';
  const companyName = profile?.companyName || '우리 회사';
  const visibleNavItems = profile?.role === '관리자'
    ? navItems
    : navItems.filter(({ href }) => href === '/' || href === '/my-leave');
  
  return (
    <div className="app-shell noise">
      <header className="fixed inset-x-0 top-0 z-40 flex h-[68px] items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/.9)] px-5 backdrop-blur-md md:hidden">
        <Link href="/" onClick={() => setMobileOpen(false)} data-testid="link-mobile-logo" className="flex items-center gap-2.5">
          <BrandMark small />
          <span className="text-[15px] font-extrabold tracking-[-.04em]">온휴</span>
        </Link>
        <button type="button" onClick={() => setMobileOpen((open) => !open)} data-testid="button-mobile-menu" className="rounded-lg p-2 text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]">
          {mobileOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </header>
      <aside className={`fixed inset-y-0 left-0 z-50 w-[248px] -translate-x-full bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] transition-transform duration-300 md:translate-x-0 ${mobileOpen ? 'translate-x-0' : ''}`}>
        <div className="flex h-full flex-col px-5 py-6">
          <Link href="/" onClick={() => setMobileOpen(false)} data-testid="link-logo" className="mb-14 flex items-center gap-3 px-2">
            <BrandMark />
            <div>
              <div className="text-[17px] font-extrabold tracking-[-.05em]">온휴</div>
              <div className="mt-0.5 font-mono text-[9px] tracking-[.13em] text-[hsl(var(--sidebar-foreground)/.5)]">연차 관리 데스크</div>
            </div>
          </Link>
          <div className="mb-3 px-3 font-mono text-[9px] font-medium tracking-[.18em] text-[hsl(var(--sidebar-foreground)/.42)]">{companyName}</div>
          <nav className="space-y-1.5">
            {visibleNavItems.map(({ href, label, icon: Icon }) => {
              const isActive = activePath === href;
              return (
                <Link key={href} href={href} onClick={() => setMobileOpen(false)} data-testid={`link-nav-${label}`} className={`group flex items-center justify-between rounded-xl px-3 py-3 text-[13px] font-semibold transition-colors ${isActive ? 'bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))]' : 'text-[hsl(var(--sidebar-foreground)/.72)] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]'}`}>
                  <span className="flex items-center gap-3"><Icon size={17} strokeWidth={isActive ? 2.5 : 1.8} />{label}</span>
                  {href === '/requests' && <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-[hsl(var(--sidebar-primary-foreground)/.35)]' : 'bg-[hsl(var(--sidebar-foreground)/.35)]'}`} />}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto">
            <Link href="/apply" onClick={() => setMobileOpen(false)} data-testid="link-apply-sidebar" className="group mb-7 flex items-center justify-between rounded-xl bg-[hsl(var(--sidebar-accent))] px-3.5 py-3.5 transition-colors hover:bg-[hsl(var(--sidebar-primary))] hover:text-[hsl(var(--sidebar-primary-foreground))]">
              <span className="flex items-center gap-3 text-[13px] font-semibold"><CalendarDays size={17} />휴가 신청하기</span>
              <ChevronRight size={16} />
            </Link>
            <div className="border-t border-[hsl(var(--sidebar-border))] pt-4">
              <div className="flex items-center gap-3 px-2">
                <Avatar name={userName} color="gold" />
                <div className="min-w-0 flex-1"><div className="truncate text-[12px] font-semibold">{userName}</div><div className="mt-0.5 text-[10px] text-[hsl(var(--sidebar-foreground)/.5)]">{user?.primaryEmailAddress?.emailAddress}</div></div>
                <button type="button" onClick={() => signOut()} className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-[hsl(var(--sidebar-foreground)/.5)] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]">
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
      {mobileOpen && <button aria-label="메뉴 닫기" data-testid="button-close-mobile-menu" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-[hsl(var(--foreground)/.35)] md:hidden" />}
      <main className="min-h-[100dvh] pt-[68px] md:ml-[248px] md:pt-0">{children}</main>
    </div>
  );
}

function BrandMark({ small = false }: { small?: boolean }) {
  return <div className={`${small ? 'h-8 w-8' : 'h-10 w-10'} relative flex items-center justify-center rounded-[11px] bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))]`}><CalendarDays size={small ? 17 : 21} strokeWidth={2.4} /></div>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="flex flex-col gap-5 border-b border-[hsl(var(--border))] px-5 py-8 sm:px-8 md:flex-row md:items-end md:justify-between md:px-10 md:py-10">
      <div><div className="eyebrow mb-3">{eyebrow}</div><h1 className="text-[28px] font-extrabold tracking-[-.06em] sm:text-[34px]">{title}</h1>{description && <p className="mt-2 text-[13px] text-[hsl(var(--muted-foreground))]">{description}</p>}</div>
      {action}
    </header>
  );
}

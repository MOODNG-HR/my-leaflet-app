import { useState, type ReactNode } from 'react';
import { CalendarDays, CalendarOff, ClipboardCheck, LayoutDashboard, LogOut, Menu, Users, X } from 'lucide-react';
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
  const companyName = profile?.companyName || '무등기업';
  const visibleNavItems = profile?.role === '관리자'
    ? navItems
    : navItems.filter(({ href }) => href === '/' || href === '/my-leave');
  
  return (
    <div className="app-shell flex min-h-[100dvh]">
      {/* Mobile header */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-[hsl(var(--border))] bg-white px-4 md:hidden">
        <Link href="/" onClick={() => setMobileOpen(false)} data-testid="link-mobile-logo" className="flex items-center gap-2">
          <BrandMark small />
          <span className="border-l border-[hsl(var(--border))] pl-2 ml-1 text-xs font-semibold text-[hsl(var(--foreground))]">인사관리 시스템</span>
        </Link>
        <button type="button" onClick={() => setMobileOpen((open) => !open)} data-testid="button-mobile-menu" className="p-2 text-[hsl(var(--foreground))]">
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[240px] -translate-x-full bg-[hsl(var(--sidebar))] border-r border-[hsl(var(--sidebar-border))] transition-transform duration-200 md:translate-x-0 ${mobileOpen ? 'translate-x-0' : ''}`}>
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center px-6 border-b border-[hsl(var(--sidebar-border))]">
            <Link href="/" onClick={() => setMobileOpen(false)} data-testid="link-logo" className="flex items-center gap-3">
              <BrandMark />
              <div className="border-l border-[hsl(var(--sidebar-border))] pl-3">
                <div className="text-xs font-bold text-[hsl(var(--sidebar-foreground))]">인사관리 시스템</div>
              </div>
            </Link>
          </div>
          
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="mb-4 px-2 text-xs font-semibold text-[hsl(var(--muted-foreground))]">{companyName}</div>
            <nav className="space-y-1">
              {visibleNavItems.map(({ href, label, icon: Icon }) => {
                const isActive = activePath === href;
                return (
                  <Link key={href} href={href} onClick={() => setMobileOpen(false)} data-testid={`link-nav-${label}`} className={`group flex items-center justify-between rounded-sm px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))]' : 'text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]'}`}>
                    <span className="flex items-center gap-3"><Icon size={16} strokeWidth={2} />{label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="border-t border-[hsl(var(--sidebar-border))] p-4">
            <Link href="/apply" onClick={() => setMobileOpen(false)} data-testid="link-apply-sidebar" className="mb-4 flex w-full items-center justify-center gap-2 bg-[hsl(var(--primary))] py-2 text-sm font-medium text-white transition-colors hover:bg-[hsl(var(--primary))/0.9]">
              휴가 신청
            </Link>
            
            <div className="flex items-center gap-3 px-2">
              <Avatar name={userName} color="gold" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{userName}</div>
                <div className="truncate text-xs text-[hsl(var(--muted-foreground))]">{user?.primaryEmailAddress?.emailAddress}</div>
              </div>
              <button type="button" onClick={() => signOut()} className="ml-auto text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {mobileOpen && <button aria-label="메뉴 닫기" data-testid="button-close-mobile-menu" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-black/20 md:hidden" />}
      
      <main className="flex-1 pt-14 md:ml-[240px] md:pt-0">{children}</main>
    </div>
  );
}

function BrandMark({ small = false }: { small?: boolean }) {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  return (
    <img 
      src={`${basePath}/logo.png`} 
      alt="무등기업" 
      className={`${small ? 'h-4' : 'h-5'} object-contain`} 
    />
  );
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 border-b border-[hsl(var(--border))] bg-white px-6 py-6 sm:px-8 md:flex-row md:items-center md:justify-between md:py-8">
      <div>
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">{title}</h1>
        {description && <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </header>
  );
}

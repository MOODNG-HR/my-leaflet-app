import { type ReactNode, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, useAuth, useUser, Show } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { Link, Route, Switch, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import {
  getGetEmployeesQueryKey,
  getGetMyEmployeeQueryKey,
  useGetMyEmployee,
  useRegisterMyEmployee,
} from '@workspace/api-client-react';

import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

import NotFound from '@/pages/not-found';
import DashboardPage from '@/pages/dashboard';
import RequestsPage from '@/pages/requests';
import EmployeesPage from '@/pages/employees';
import ApplyPage from '@/pages/apply';
import MyLeavePage from '@/pages/my-leave';
import AbsencePage from '@/pages/absence';
import SignInPage from '@/pages/sign-in';
import SignUpPage from '@/pages/sign-up';
import { AppShell } from '@/components/layout';

const queryClient = new QueryClient();

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <SignedInHome />
      </Show>
      <Show when="signed-out">
        <PublicHome />
      </Show>
    </>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setLocation('/sign-in');
    }
  }, [isLoaded, isSignedIn, setLocation]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[hsl(var(--background))]">
        <div className="skeleton h-10 w-10 rounded-full" />
      </div>
    );
  }

  if (!isSignedIn) return null;

  return <>{children}</>;
}

function SignedInHome() {
  const profile = useGetMyEmployee({
    query: { queryKey: getGetMyEmployeeQueryKey(), retry: false },
  });
  if (profile.isLoading) {
    return <div className="flex min-h-[100dvh] items-center justify-center"><div className="skeleton h-10 w-10 rounded-full" /></div>;
  }
  return <AppShell>{profile.data?.role === '관리자' ? <DashboardPage /> : <MyLeavePage />}</AppShell>;
}

function PublicHome() {
  return (
    <main className="grid min-h-[100dvh] bg-[hsl(var(--background))] lg:grid-cols-[minmax(420px,42%)_1fr]">
      <section className="flex flex-col justify-between bg-[hsl(var(--primary))] p-8 text-[hsl(var(--primary-foreground))] sm:p-12 lg:p-16">
        <div className="text-lg font-extrabold tracking-[-.04em]">온휴</div>
        <div className="py-20">
          <div className="eyebrow text-[hsl(var(--secondary))]">ANNUAL LEAVE DESK</div>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-[-.055em] sm:text-5xl">단단하고 믿음직한<br />우리 회사 연차 데스크</h1>
          <p className="mt-6 max-w-md text-sm leading-7 opacity-70">입사일 기준 연차 생성부터 신청, 승인, 월별 내역, 결근 기록까지 한곳에서 정확하게 관리합니다.</p>
        </div>
        <div className="font-mono text-[10px] tracking-[.15em] opacity-60">DEPENDABLE WORKPLACE</div>
      </section>
      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="surface w-full max-w-lg p-7 sm:p-10">
          <div className="eyebrow">온휴 시작하기</div>
          <h2 className="mt-3 text-2xl font-extrabold tracking-[-.04em]">휴가 현황을 더 명확하게</h2>
          <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">직원은 남은 연차와 신청 내역을 확인하고, 관리자는 승인과 결근 기록을 처리할 수 있습니다.</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link href="/sign-in" className="inline-flex h-12 items-center justify-center rounded-xl bg-[hsl(var(--primary))] text-sm font-bold text-[hsl(var(--primary-foreground))] hover:brightness-110">로그인</Link>
            <Link href="/sign-up" className="inline-flex h-12 items-center justify-center rounded-xl border border-[hsl(var(--border))] text-sm font-bold hover:bg-[hsl(var(--muted))]">회원가입</Link>
          </div>
          <div className="mt-8 grid gap-3 border-t border-[hsl(var(--border))] pt-6 text-xs text-[hsl(var(--muted-foreground))] sm:grid-cols-3">
            <span>입사일 기준 자동 부여</span>
            <span>잔여 연차 자동 검증</span>
            <span>연도·월별 이력 조회</span>
          </div>
        </div>
      </section>
    </main>
  );
}

function ProfileBootstrap() {
  const { isLoaded, isSignedIn, user } = useUser();
  const register = useRegisterMyEmployee();
  const queryClient = useQueryClient();
  const attempted = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user || attempted.current) return;
    const companyName = sessionStorage.getItem('onhue_company_name');
    const name = sessionStorage.getItem('onhue_employee_name');
    const email = user.primaryEmailAddress?.emailAddress;
    if (!companyName || !name || !email) return;
    attempted.current = true;
    register.mutate(
      { data: { companyName, name, email } },
      {
        onSuccess: () => {
          sessionStorage.removeItem('onhue_company_name');
          sessionStorage.removeItem('onhue_employee_name');
          queryClient.invalidateQueries({ queryKey: getGetMyEmployeeQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetEmployeesQueryKey() });
        },
        onError: () => {
          attempted.current = false;
        },
      },
    );
  }, [isLoaded, isSignedIn, queryClient, register, user]);

  return null;
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        
        {/* Protected Routes */}
        <Route path="/" component={HomeRedirect} />
        <Route path="/requests" component={() => <ProtectedRoute><AppShell><RequestsPage /></AppShell></ProtectedRoute>} />
        <Route path="/employees" component={() => <ProtectedRoute><AppShell><EmployeesPage /></AppShell></ProtectedRoute>} />
        <Route path="/apply" component={() => <ProtectedRoute><AppShell><ApplyPage /></AppShell></ProtectedRoute>} />
        <Route path="/my-leave" component={() => <ProtectedRoute><AppShell><MyLeavePage /></AppShell></ProtectedRoute>} />
        <Route path="/absence" component={() => <ProtectedRoute><AppShell><AbsencePage /></AppShell></ProtectedRoute>} />
        
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider 
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ProfileBootstrap />
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  if (!clerkPubKey) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center p-6 text-center bg-[#f7f6f2] text-[#1b2b27]">
        <h1 className="mb-2 text-xl font-bold">인증 설정 필요</h1>
        <p className="text-sm opacity-70">Clerk Publishable Key가 환경 변수에 없습니다.</p>
      </div>
    );
  }
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;

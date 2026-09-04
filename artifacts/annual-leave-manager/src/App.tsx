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
import AttendanceRecordPage from '@/pages/absence';
import SignInPage from '@/pages/sign-in';
import SignUpPage from '@/pages/sign-up';
import AdminEmployeesPage from '@/pages/admin-employees';
import AdminEmployeeNewPage from '@/pages/admin-employee-new';
import AdminEmployeeDetailPage from '@/pages/admin-employee-detail';
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
  const { isLoaded, isSignedIn } = useAuth();
  const [, setLocation] = useLocation();
  const profile = useGetMyEmployee({
    query: { queryKey: getGetMyEmployeeQueryKey(), retry: false, enabled: isLoaded && isSignedIn },
  });

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setLocation('/sign-in');
    } else if (isLoaded && isSignedIn && profile.isSuccess) {
      if (profile.data.role === '관리자' && profile.data.status === 'active') {
        setLocation('/admin');
      } else {
        setLocation('/app');
      }
    }
  }, [isLoaded, isSignedIn, profile.isSuccess, profile.data, setLocation]);

  if (!isLoaded || (isSignedIn && profile.isLoading)) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[hsl(var(--background))]">
        <div className="skeleton h-8 w-8" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <PublicHome />;
  }

  return null;
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [, setLocation] = useLocation();
  const profile = useGetMyEmployee({
    query: { queryKey: getGetMyEmployeeQueryKey(), retry: false },
  });

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setLocation('/sign-in');
    } else if (isLoaded && isSignedIn && profile.isSuccess) {
      if (profile.data.role !== '관리자' || profile.data.status !== 'active') {
        setLocation('/app');
      }
    }
  }, [isLoaded, isSignedIn, profile.isSuccess, profile.data, setLocation]);

  if (!isLoaded || profile.isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[hsl(var(--background))]">
        <div className="skeleton h-8 w-8" />
      </div>
    );
  }

  if (!isSignedIn || !profile.data || profile.data.role !== '관리자' || profile.data.status !== 'active') return null;

  return <>{children}</>;
}

function EmployeeRoute({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [, setLocation] = useLocation();
  const profile = useGetMyEmployee({
    query: { queryKey: getGetMyEmployeeQueryKey(), retry: false },
  });

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setLocation('/sign-in');
    } else if (isLoaded && isSignedIn && profile.isSuccess) {
      if (profile.data.status !== 'active') {
        // Just let them view empty state or something, or we could redirect them to a specific inactive page.
      }
    }
  }, [isLoaded, isSignedIn, profile.isSuccess, profile.data, setLocation]);

  if (!isLoaded || profile.isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[hsl(var(--background))]">
        <div className="skeleton h-8 w-8" />
      </div>
    );
  }

  if (!isSignedIn || !profile.data) return null;

  return <>{children}</>;
}

function PublicHome() {
  return (
    <main className="flex min-h-[100dvh] flex-col bg-[hsl(var(--background))]">
      <header className="flex h-14 items-center justify-between border-b border-[hsl(var(--border))] bg-white px-6">
        <div className="flex items-center gap-3">
          <img src={`${basePath}/logo.png`} alt="무등기업" className="h-5 object-contain" />
          <span className="text-xs font-bold text-[hsl(var(--foreground))] border-l border-[hsl(var(--border))] pl-3">
            임직원 인사관리 시스템
          </span>
        </div>
      </header>
      
      <div className="flex flex-1 flex-col lg:flex-row">
        <section className="hidden w-1/2 flex-col justify-between border-r border-[hsl(var(--border))] bg-white p-12 lg:flex relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
          
          <div className="relative z-10 my-auto">
            <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--foreground))] leading-snug">
              무등기업 임직원<br />인사관리 시스템
            </h1>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
              입사일 기준 연차 생성부터 신청, 승인, 월별 내역, 결근 기록까지 단일 시스템에서 정확하게 관리합니다.
            </p>
            
            <div className="mt-12 grid gap-6 border-t border-[hsl(var(--border))] pt-8 text-sm grid-cols-2 max-w-md">
              <div className="flex flex-col gap-1.5">
                <span className="font-semibold text-[hsl(var(--foreground))]">자동 부여</span>
                <span className="text-[hsl(var(--muted-foreground))]">입사일 기준 자동 연차 생성 및 검증</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="font-semibold text-[hsl(var(--foreground))]">이력 관리</span>
                <span className="text-[hsl(var(--muted-foreground))]">연도 및 월별 휴가 사용 이력 조회</span>
              </div>
            </div>
          </div>
        </section>
        
        <section className="flex flex-1 items-center justify-center p-6 sm:p-12 bg-[hsl(var(--background))]">
          <div className="w-full max-w-[360px] animate-rise bg-white border border-[hsl(var(--border))] rounded p-8">
            <div className="mb-8 border-b border-[hsl(var(--border))] pb-5">
              <h2 className="text-xl font-bold tracking-tight">시스템 접근</h2>
              <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">사번 또는 이메일과 비밀번호로 로그인하세요.</p>
            </div>
            
            <div className="grid gap-3">
              <Link href="/sign-in" className="flex h-10 w-full items-center justify-center bg-[hsl(var(--primary))] rounded text-sm font-medium text-white transition-colors hover:bg-[hsl(var(--primary))/0.9] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2">
                로그인
              </Link>
              <Link href="/sign-up" className="flex h-10 w-full items-center justify-center border border-[hsl(var(--border))] rounded bg-white text-sm font-medium text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--secondary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2">
                계정 등록
              </Link>
            </div>
          </div>
        </section>
      </div>

      <footer className="flex h-12 items-center justify-center border-t border-[hsl(var(--border))] bg-white text-[11px] text-[hsl(var(--muted-foreground))]">
        &copy; {new Date().getFullYear()} 무등기업 HR Management System. All rights reserved.
      </footer>
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
        
        {/* Redirects */}
        <Route path="/" component={HomeRedirect} />
        <Route path="/my-leave" component={() => <Redirect to="/app" />} />
        <Route path="/requests" component={() => <Redirect to="/admin/requests" />} />
        <Route path="/employees" component={() => <Redirect to="/admin/employees" />} />
        
        {/* Administrator Routes */}
        <Route path="/admin" component={() => <AdminRoute><AppShell><DashboardPage /></AppShell></AdminRoute>} />
        <Route path="/admin/requests" component={() => <AdminRoute><AppShell><RequestsPage /></AppShell></AdminRoute>} />
        <Route path="/admin/employees" component={() => <AdminRoute><AppShell><AdminEmployeesPage /></AppShell></AdminRoute>} />
        <Route path="/admin/employees/new" component={() => <AdminRoute><AppShell><AdminEmployeeNewPage /></AppShell></AdminRoute>} />
        <Route path="/admin/employees/:id" component={() => <AdminRoute><AppShell><AdminEmployeeDetailPage /></AppShell></AdminRoute>} />
        <Route path="/admin/attendance" component={() => <AdminRoute><AppShell><AttendanceRecordPage /></AppShell></AdminRoute>} />

        {/* Employee Routes */}
        <Route path="/app" component={() => <EmployeeRoute><AppShell><MyLeavePage /></AppShell></EmployeeRoute>} />
        <Route path="/apply" component={() => <EmployeeRoute><AppShell><ApplyPage /></AppShell></EmployeeRoute>} />
        
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

const clerkAppearance = {
  elements: {
    rootBox: 'w-full',
    card: 'clerk-enterprise-card rounded shadow-none border border-[hsl(var(--border))] bg-white',
    cardBox: 'clerk-enterprise-card-box rounded shadow-none w-full',
    headerTitle: 'text-xl font-bold text-[hsl(var(--foreground))] tracking-tight',
    headerSubtitle: 'text-xs text-[hsl(var(--muted-foreground))]',
    formButtonPrimary: 'bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))/0.9] rounded shadow-none text-white h-10 text-sm font-medium transition-colors',
    formFieldInput: 'rounded border border-[hsl(var(--input))] h-10 text-sm focus:border-[hsl(var(--ring))] focus:ring-1 focus:ring-[hsl(var(--ring))]',
    formFieldLabel: 'text-xs font-semibold text-[hsl(var(--foreground))]',
    footerActionLink: 'text-[hsl(var(--primary))] font-semibold hover:text-[hsl(var(--primary))/0.9]',
    socialButtonsBlockButton: 'hidden',
    dividerRow: 'hidden',
    footer: 'hidden',
    identityPreviewEditButtonIcon: 'text-[hsl(var(--primary))]',
    formFieldSuccessText: 'text-[hsl(var(--primary))]',
    formFieldErrorText: 'text-[hsl(var(--destructive))]',
    logoBox: 'hidden',
  },
  variables: {
    colorPrimary: 'hsl(9, 82%, 55%)',
    colorBackground: 'white',
    colorText: 'hsl(220, 15%, 10%)',
    colorDanger: 'hsl(3, 80%, 50%)',
    colorInputBackground: 'white',
    colorInputText: 'hsl(220, 15%, 10%)',
    fontFamily: '"Pretendard", sans-serif',
    borderRadius: '0.25rem'
  }
};

const clerkLocalization = {
  locale: 'ko-KR',
  formFieldLabel__emailAddress: '이메일',
  formFieldLabel__emailAddress_username: '사번 또는 이메일',
  formFieldLabel__password: '비밀번호',
  formFieldLabel__confirmPassword: '비밀번호 확인',
  formFieldLabel__firstName: '이름',
  formFieldInputPlaceholder__emailAddress: '회사 이메일을 입력하세요',
  formFieldInputPlaceholder__emailAddress_username: '사번 또는 이메일을 입력하세요',
  formFieldInputPlaceholder__password: '비밀번호를 입력하세요',
  formFieldInputPlaceholder__signUpPassword: '비밀번호를 설정하세요',
  formButtonPrimary: '계속',
  formButtonPrimary__verify: '인증하기',
  formFieldAction__forgotPassword: '비밀번호 찾기',
  backButton: '이전',
  dividerText: '또는',
  signIn: {
    start: {
      title: '시스템 로그인',
      titleCombined: '시스템 로그인',
      subtitle: '등록된 이메일 계정으로 로그인하세요.',
      subtitleCombined: '등록된 이메일 계정으로 로그인하세요.',
      actionText: '계정이 없으신가요?',
      actionLink: '계정 등록',
    },
    password: {
      title: '비밀번호 입력',
      subtitle: '계정 비밀번호를 입력하세요.',
      actionLink: '다른 계정 사용',
    },
  },
  signUp: {
    start: {
      title: '계정 등록',
      titleCombined: '계정 등록',
      subtitle: '무등기업 임직원 계정을 등록합니다.',
      subtitleCombined: '무등기업 임직원 계정을 등록합니다.',
      actionText: '이미 계정이 있으신가요?',
      actionLink: '로그인',
    },
  },
};

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
      appearance={clerkAppearance}
      localization={clerkLocalization}
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
      <div className="flex min-h-[100dvh] flex-col items-center justify-center p-6 text-center bg-white text-[hsl(var(--foreground))]">
        <h1 className="mb-2 text-xl font-bold">인증 설정 필요</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Clerk Publishable Key가 환경 변수에 없습니다.</p>
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

import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import DashboardPage from '@/pages/dashboard';
import RequestsPage from '@/pages/requests';
import EmployeesPage from '@/pages/employees';
import ApplyPage from '@/pages/apply';
import { AppShell } from '@/components/layout';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={() => <AppShellPage><DashboardPage /></AppShellPage>} />
        <Route path="/requests" component={() => <AppShellPage><RequestsPage /></AppShellPage>} />
        <Route path="/employees" component={() => <AppShellPage><EmployeesPage /></AppShellPage>} />
        <Route path="/apply" component={() => <AppShellPage><ApplyPage /></AppShellPage>} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function AppShellPage({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

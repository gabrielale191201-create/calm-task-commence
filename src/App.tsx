import { lazy, Suspense, useMemo } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthStateProvider, useAuthState } from "@/hooks/useAuthState";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingScreen } from "@/components/LoadingScreen";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const CalendarCallback = lazy(() => import("./pages/CalendarCallback"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const About = lazy(() => import("./pages/About"));

const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { authStatus, isLoading, isAuthenticated, isGuest } = useAuthState();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen message="Preparando tu espacio..." />;
  }

  if (isAuthenticated || isGuest) {
    return <>{children}</>;
  }

  const authPath = location.search.includes('gcal_connect=1') ? `/auth${location.search}` : '/auth';
  return <Navigate to={authPath} replace />;
}

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const onboardingDone = useMemo(() => {
    try {
      const stored = localStorage.getItem('focuson-onboarding-done');
      if (stored) return JSON.parse(stored) === true;
    } catch {}
    return false;
  }, []);

  if (!onboardingDone) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen message="Cargando..." />}>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/privacidad" element={<Privacy />} />
        <Route path="/terminos" element={<Terms />} />
        <Route path="/about" element={<About />} />
        <Route path="/sobre" element={<About />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/calendar/callback" element={
          <ProtectedRoute>
            <CalendarCallback />
          </ProtectedRoute>
        } />
        
        
        <Route path="/onboarding" element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        } />
        <Route path="/" element={
          <ProtectedRoute>
            <OnboardingGuard>
              <Index />
            </OnboardingGuard>
          </ProtectedRoute>
        } />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => {

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthStateProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </AuthStateProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;

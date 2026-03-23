import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthStateProvider, useAuthState } from "@/hooks/useAuthState";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingScreen } from "@/components/LoadingScreen";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { authStatus, isLoading, isAuthenticated, isGuest } = useAuthState();

  if (isLoading) {
    return <LoadingScreen message="Preparando tu espacio..." />;
  }

  if (isAuthenticated || isGuest) {
    return <>{children}</>;
  }

  return <Navigate to="/auth" replace />;
}

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  // Check if onboarding is completed
  let onboardingDone = false;
  try {
    const stored = localStorage.getItem('focuson-onboarding-done');
    if (stored) onboardingDone = JSON.parse(stored) === true;
  } catch {}

  if (!onboardingDone) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
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
  );
}

const App = () => (
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

export default App;

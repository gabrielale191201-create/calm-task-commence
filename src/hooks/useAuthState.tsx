import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Auth status types - 'unauthenticated' added for explicit no-session state
export type AuthStatus = 'loading' | 'authenticated' | 'guest' | 'unauthenticated';

// Storage keys
const GUEST_MODE_KEY = 'focuson-guest-mode';
const GUEST_ID_KEY = 'focuson-guest-id';

// Generate a persistent guest ID
function getOrCreateGuestId(): string {
  try {
    let guestId = localStorage.getItem(GUEST_ID_KEY);
    if (!guestId) {
      guestId = `guest_${crypto.randomUUID()}`;
      localStorage.setItem(GUEST_ID_KEY, guestId);
    }
    return guestId;
  } catch {
    return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Check if guest mode is active
export function checkGuestMode(): boolean {
  try {
    const stored = localStorage.getItem(GUEST_MODE_KEY);
    return stored ? JSON.parse(stored) === true : false;
  } catch {
    return false;
  }
}

// Set guest mode
function setGuestModeStorage(value: boolean): void {
  try {
    if (value) {
      localStorage.setItem(GUEST_MODE_KEY, 'true');
      getOrCreateGuestId(); // Ensure guestId exists
    } else {
      localStorage.removeItem(GUEST_MODE_KEY);
    }
  } catch {
    console.error('Failed to set guest mode');
  }
}

interface AuthStateValue {
  // Status
  authStatus: AuthStatus;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  
  // User data
  user: User | null;
  session: Session | null;
  guestId: string | null;
  
  // Unified ID (user.id for authenticated, guestId for guests)
  currentUserId: string | null;
  
  // Actions
  signUp: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<{ error: any }>;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
}

const AuthStateContext = createContext<AuthStateValue | null>(null);

export function AuthStateProvider({ children }: { children: ReactNode }) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [guestId, setGuestId] = useState<string | null>(null);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        // Check guest mode first (synchronous, fast)
        const isGuestModeActive = checkGuestMode();
        
        if (isGuestModeActive) {
          if (mounted) {
            setGuestId(getOrCreateGuestId());
            setAuthStatus('guest');
          }
          return; // Don't check Supabase if in guest mode
        }

        // Not in guest mode, check Supabase session
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (error) {
          console.error('Error getting session:', error);
          // On error, mark as unauthenticated so redirect can happen
          setAuthStatus('unauthenticated');
          return;
        }

        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          setAuthStatus('authenticated');
        } else {
          // No session and not guest = unauthenticated, need to login
          setAuthStatus('unauthenticated');
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (mounted) {
          // On error, mark as unauthenticated
          setAuthStatus('unauthenticated');
        }
      }
    };

    initAuth();

    // Listen for auth changes (only if not in guest mode)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;
        
        // Ignore auth changes if in guest mode
        if (checkGuestMode()) return;

        if (newSession) {
          setSession(newSession);
          setUser(newSession.user);
          setAuthStatus('authenticated');
        } else {
          setSession(null);
          setUser(null);
          setAuthStatus('unauthenticated');
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl }
    });
    return { data, error };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (!error && data.session) {
      // Clear guest mode when signing in
      setGuestModeStorage(false);
      setGuestId(null);
    }
    return { data, error };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setSession(null);
      setUser(null);
      setAuthStatus('unauthenticated');
    }
    return { error };
  }, []);

  const enterGuestMode = useCallback(() => {
    setGuestModeStorage(true);
    const newGuestId = getOrCreateGuestId();
    setGuestId(newGuestId);
    setAuthStatus('guest');
  }, []);

  const exitGuestMode = useCallback(() => {
    setGuestModeStorage(false);
    setGuestId(null);
    setAuthStatus('unauthenticated');
  }, []);

  const value: AuthStateValue = {
    authStatus,
    isLoading: authStatus === 'loading',
    isAuthenticated: authStatus === 'authenticated',
    isGuest: authStatus === 'guest',
    user,
    session,
    guestId,
    currentUserId: authStatus === 'authenticated' ? user?.id ?? null : guestId,
    signUp,
    signIn,
    signOut,
    enterGuestMode,
    exitGuestMode,
  };

  return (
    <AuthStateContext.Provider value={value}>
      {children}
    </AuthStateContext.Provider>
  );
}

export function useAuthState(): AuthStateValue {
  const context = useContext(AuthStateContext);
  if (!context) {
    throw new Error('useAuthState must be used within AuthStateProvider');
  }
  return context;
}

// Legacy hook for backwards compatibility
export function useAuth() {
  const state = useAuthState();
  return {
    user: state.user,
    session: state.session,
    loading: state.isLoading,
    signUp: state.signUp,
    signIn: state.signIn,
    signOut: state.signOut,
    isAuthenticated: state.isAuthenticated,
  };
}

// Export guest mode utilities for components that need direct access
export { checkGuestMode as isGuestMode, getOrCreateGuestId };

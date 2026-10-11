/**
 * auth.tsx
 *
 * Provides AuthContext via AuthProvider.
 * - Wraps the app inside BrowserRouter so NavBar can use <Link>.
 * - On mount, restores any existing Supabase session.
 * - signIn() triggers Google OAuth; after redirect, POST /auth/me is called
 *   exactly once per signed-in session via a module-level promise guard so
 *   React StrictMode double-effects and concurrent onAuthStateChange / getSession
 *   events cannot start two parallel requests.
 * - If POST /auth/me fails the user sees an error with "Try again" and "Sign out"
 *   buttons – never a silent redirect to /login.
 * - signOut() clears the session and goes to /login.
 * - Exposes: user (Supabase User | null), profile ({ full_name, email, role }
 *   | null), loading boolean, authError string | null, signIn(), signOut().
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { api } from './api';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
}

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  /** Set when POST /auth/me fails. Shows an error instead of a redirect loop. */
  authError: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Clears authError and retries POST /auth/me for the current user. */
  retryLoadProfile: () => void;
}

// ── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

// ── Role → home route ────────────────────────────────────────────────────────

function homeForRole(role: Profile['role']): string {
  if (role === 'PATIENT') return '/patient/book';
  if (role === 'DOCTOR') return '/doctor/appointments';
  if (role === 'ADMIN') return '/admin/users';
  return '/login';
}

// ── In-flight guard ──────────────────────────────────────────────────────────
// One Promise that is shared across every concurrent caller so that
// React StrictMode double-effects and simultaneous getSession / onAuthStateChange
// events never fire two POST /auth/me requests for the same user session.
// Keyed by userId so it resets correctly on sign-out / sign-in.

let inflightUserId: string | null = null;
let inflightPromise: Promise<{ profile: Profile }> | null = null;

function getOrCreateInflight(userId: string): Promise<{ profile: Profile }> {
  if (inflightUserId === userId && inflightPromise) {
    // Re-use the existing in-flight request.
    return inflightPromise;
  }
  // New user or no request in flight yet.
  inflightUserId = userId;
  inflightPromise = api<{ profile: Profile }>('/auth/me', { method: 'POST' }).finally(() => {
    // Clear so a deliberate retry (after error) can start a fresh request.
    if (inflightUserId === userId) {
      inflightPromise = null;
    }
  });
  return inflightPromise;
}

function clearInflight() {
  inflightUserId = null;
  inflightPromise = null;
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  /** Call POST /auth/me exactly once per session; share in-flight request. */
  const loadProfile = useCallback(
    async (currentUser: User) => {
      setAuthError(null);
      try {
        const res = await getOrCreateInflight(currentUser.id);
        const p = res.profile;
        setProfile(p);
        if (location.pathname === '/login') {
          navigate(homeForRole(p.role), { replace: true });
        }
      } catch (err) {
        // Do NOT redirect to /login – surface the error so the user can retry.
        const msg =
          err instanceof Error ? err.message : 'Failed to load your profile.';
        setAuthError(msg);
        setProfile(null);
        // Clear inflight so a retry can start a fresh request.
        clearInflight();
      }
    },
    [location.pathname, navigate],
  );

  // Restore session on mount and subscribe to auth changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) {
        loadProfile(u).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          // loadProfile shares the in-flight request if one is already running.
          loadProfile(u);
        } else {
          setProfile(null);
          setAuthError(null);
          clearInflight();
        }
      },
    );

    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/login' },
    });
  }, []);

  const signOut = useCallback(async () => {
    clearInflight();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setAuthError(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  const retryLoadProfile = useCallback(() => {
    if (!user) return;
    // Clear any cached error inflight and try again.
    clearInflight();
    loadProfile(user);
  }, [user, loadProfile]);

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, authError, signIn, signOut, retryLoadProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

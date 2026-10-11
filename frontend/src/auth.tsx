/**
 * auth.tsx
 *
 * Provides AuthContext via AuthProvider.
 * - Wraps the app inside BrowserRouter so NavBar can use <Link>.
 * - On mount, restores any existing Supabase session.
 * - signIn() triggers Google OAuth then calls POST /auth/me to create/load
 *   the profile; redirects by role only when the current path is /login.
 * - signOut() clears the session and goes to /login.
 * - Exposes: user (Supabase User | null), profile ({ full_name, email, role }
 *   | null), loading boolean, signIn(), signOut().
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
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
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
  return '/admin/users';
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  /** Load profile from backend; redirect by role only when on /login */
  const loadProfile = useCallback(
    async (_currentUser: User) => {
      try {
        const p = await api<Profile>('/auth/me', { method: 'POST' });
        setProfile(p);
        if (location.pathname === '/login') {
          navigate(homeForRole(p.role), { replace: true });
        }
      } catch {
        // profile load failed – leave user on login
        setProfile(null);
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
          loadProfile(u);
        } else {
          setProfile(null);
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
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

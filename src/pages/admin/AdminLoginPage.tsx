import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { claimFirstAdmin, hasAdminAccount } from '@/lib/api/admin';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { BrandMark } from '@/components/SiteLayout';
import { LoadingState } from '@/components/ui/StatusViews';

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function friendlyAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'Email or password is incorrect.';
  if (message.includes('already registered')) return 'An account with this email already exists. Sign in instead.';
  if (message.includes('Email not confirmed')) return 'Please confirm your email address first.';
  return message || 'Something went wrong. Please try again.';
}

export default function AdminLoginPage() {
  useDocumentMeta('Admin Sign In | Shasank Photography', 'Private sign-in for the photography dashboard.');
  const { session, isAdmin, loading: authLoading, signOut } = useAuth();
  const adminSetup = useAsyncData(hasAdminAccount, []);
  const [forceSignIn, setForceSignIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (authLoading || adminSetup.loading) return <LoadingState label="Preparing sign-in" />;
  if (session && isAdmin) return <Navigate to="/admin" replace />;

  const needsSetup = adminSetup.data === false;
  const showSetup = needsSetup && !forceSignIn;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!EMAIL_PATTERN.test(email.trim())) return setError('Enter a valid email address.');
    if (password.length < 8) return setError('Use a password of at least 8 characters.');

    setBusy(true);
    try {
      if (showSetup) {
        const { error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password });
        if (signUpError) throw new Error(signUpError.message);
        if (await claimFirstAdmin()) {
          window.location.assign('/admin');
          return;
        }
        await supabase.auth.signOut();
        setError('An admin account was just created. Sign in with that account.');
        adminSetup.reload();
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) throw new Error(signInError.message);
      }
    } catch (err) {
      setError(friendlyAuthError(err instanceof Error ? err.message : ''));
    } finally {
      setBusy(false);
    }
  };

  const claimExisting = async () => {
    setError(null);
    setBusy(true);
    try {
      if (await claimFirstAdmin()) {
        window.location.assign('/admin');
        return;
      }
      setError('An admin account already exists. Sign in with that account.');
      adminSetup.reload();
    } catch (err) {
      setError(friendlyAuthError(err instanceof Error ? err.message : ''));
    } finally {
      setBusy(false);
    }
  };

  if (session && !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5 py-16">
        <div className="card w-full max-w-md space-y-6 p-8 text-center">
          <h1 className="text-4xl">No admin access</h1>
          <p className="text-sm leading-relaxed text-charcoal-700">This account is not authorized to open the dashboard.</p>
          {needsSetup && (
            <button type="button" onClick={claimExisting} disabled={busy} className="btn-primary w-full">
              Make this account the admin
            </button>
          )}
          {error && <p role="alert" className="text-sm text-danger-700">{error}</p>}
          <button type="button" onClick={() => signOut()} className="btn-secondary w-full">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-16">
      <div aria-hidden="true" className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full bg-baby-200/70 blur-3xl animate-drift" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-peach-200/70 blur-3xl animate-drift [animation-delay:-6s]" />
      <div className="relative w-full max-w-md space-y-8 animate-fade-up">
        <div className="flex justify-center">
          <BrandMark name="Shasank" />
        </div>
        <form onSubmit={handleSubmit} noValidate className="card space-y-6 p-8">
          <div className="space-y-2 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-lavender-100 text-lavender-700">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="text-4xl">{showSetup ? 'Create admin account' : 'Admin sign in'}</h1>
            <p className="text-sm text-charcoal-600">
              {showSetup
                ? 'This sets up the one administrator account for the dashboard.'
                : 'Only the photographer account can open the dashboard.'}
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="label" htmlFor="admin-email">Email</label>
              <input id="admin-email" type="email" autoComplete="username" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label" htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                type="password"
                autoComplete={showSetup ? 'new-password' : 'current-password'}
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-2xl bg-danger-100 px-4 py-3 text-sm text-danger-700">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? 'Please wait...' : showSetup ? 'Create account' : 'Sign in'}
          </button>

          {needsSetup && (
            <button type="button" onClick={() => setForceSignIn((v) => !v)} className="w-full text-center text-sm text-charcoal-600 underline-offset-4 hover:underline">
              {forceSignIn ? 'Create the admin account instead' : 'I already have an account'}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

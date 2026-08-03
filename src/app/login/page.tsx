'use client';

import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginRouteGuard } from '@/components/auth/login-route-guard';
import { useAuth } from '@/components/auth/auth-provider';
import { ApiClientError } from '@/services/api-client';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function messageForError(error: unknown) {
  if (error instanceof ApiClientError) {
    if (error.status === 401) return 'The email or password is incorrect.';
    if (error.status === 423) return 'This admin account is temporarily locked. Please try again later.';
    if (error.status === 403) return 'This admin account cannot sign in right now.';
    if (error.status === 422) return 'Please enter a valid email and password.';
  }
  return 'We could not sign you in. Please try again in a moment.';
}

function LoginPageContent() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setError(null);
    if (!email.trim() || !password) { setError('Please enter your email and password.'); return; }
    setSubmitting(true);
    try { await login(email.trim(), password); router.replace('/dashboard'); }
    catch (loginError) { setError(messageForError(loginError)); }
    finally { setSubmitting(false); }
  }

  return (
    <main className="grid min-h-screen bg-slate-50 lg:grid-cols-[minmax(380px,0.9fr)_1.1fr]">
      <section className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col" aria-label="Pixel Eye Eye Care CMS">
        <div className="absolute inset-x-0 top-0 h-1 bg-sky-500" />
        <div className="flex items-center gap-3"><span className="flex h-10 w-[116px] items-center rounded-lg bg-white px-2"><img src="/assets/pixel-eye-logo.png" alt="Pixel Eye" className="h-auto w-full" /></span><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-400">Pixel Eye</p><p className="font-bold">Eye Care CMS</p></div></div>
        <div className="my-auto max-w-md"><span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300"><ShieldCheck size={14} className="text-emerald-400" aria-hidden="true" />Secure role-based administration</span><h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight">A focused workspace for trusted eye-care content.</h1><p className="mt-4 text-base leading-7 text-slate-400">Manage editorial drafts, publishing workflows, and clinical media from one protected admin portal.</p></div>
        <p className="text-xs text-slate-500">© {new Date().getFullYear()} Pixel Eye. Authorized administrators only.</p>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-8" aria-label="Admin sign in">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden"><span className="flex h-10 w-[116px] items-center rounded-lg border border-slate-200 bg-white px-2"><img src="/assets/pixel-eye-logo.png" alt="Pixel Eye" className="h-auto w-full" /></span><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-600">Pixel Eye</p><p className="font-bold text-slate-900">Eye Care CMS</p></div></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-600">Protected portal</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Welcome back</h2><p className="mt-2 text-sm leading-6 text-slate-500">Sign in with your administrator credentials to continue.</p></div>
            <form className="mt-7 space-y-5" onSubmit={handleSubmit} noValidate>
              <Input id="admin-email" label="Email address" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@pixeleye.com" leftIcon={<Mail size={16} aria-hidden="true" />} error={submitted && !email.trim() ? 'Email is required.' : undefined} />
              <Input id="admin-password" label="Password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" leftIcon={<LockKeyhole size={16} aria-hidden="true" />} rightIcon={<button type="button" className="focus-ring rounded-md p-1 text-slate-500 hover:text-slate-800" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}</button>} error={submitted && !password ? 'Password is required.' : undefined} />
              {error && <Alert variant="error">{error}</Alert>}
              <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</Button>
            </form>
          </div>
          <p className="mt-5 text-center text-xs leading-5 text-slate-500">Need access or help with your credentials? Contact your system administrator.</p>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return <LoginRouteGuard><LoginPageContent /></LoginRouteGuard>;
}
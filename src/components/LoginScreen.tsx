import { CheckCircle2, LoaderCircle, LogIn, ShieldCheck } from 'lucide-react';

interface LoginScreenProps {
  loading: boolean;
  error: string | null;
  onSignIn: () => void;
}

export function LoginScreen({ loading, error, onSignIn }: LoginScreenProps) {
  return (
    <main
      className="min-h-dvh flex items-center justify-center px-5 py-10"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-primary)' }}
    >
      <section
        className="w-full max-w-md rounded-[2rem] border p-7 sm:p-9 shadow-2xl theme-transition"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-hairline)',
        }}
      >
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            <LogIn className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--text-secondary)' }}>
              Welcome to
            </p>
            <h1 className="text-2xl font-bold tracking-tight">Repeatly</h1>
          </div>
        </div>

        <div className="space-y-3 mb-8">
          <h2 className="text-3xl font-bold tracking-tight">Your routines, kept private.</h2>
          <p className="text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
            Sign in to access your tasks, reminders, schedules, and personal workspace.
          </p>
        </div>

        <button
          type="button"
          onClick={onSignIn}
          disabled={loading}
          className="w-full min-h-12 rounded-2xl flex items-center justify-center gap-2 font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-wait"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
        >
          {loading ? <LoaderCircle className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
          {loading ? 'Signing in...' : 'Continue with Google'}
        </button>

        {error && <p className="mt-3 text-xs font-medium text-red-500">{error}</p>}

        <div className="mt-8 grid gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <span>Protected by Firebase Authentication</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <span>Your workspace loads only after verification</span>
          </div>
        </div>
      </section>
    </main>
  );
}

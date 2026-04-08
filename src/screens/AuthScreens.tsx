import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Clock,
  LogIn,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Waypoints,
} from 'lucide-react';
import { motion } from 'motion/react';
import { signInWithGoogle, logout } from '../firebase';
import { useAuth } from '../AuthContext';

const credibilitySignals = [
  {
    title: 'Vetted peer network',
    description: 'Membership is reviewed so discussion stays focused, credible, and useful in practice.',
  },
  {
    title: 'Practical field notes',
    description: 'Share the patterns, tradeoffs, and failures that usually get cut from polished summaries.',
  },
  {
    title: 'Real-world QA stories',
    description: 'Learn from work shaped by live releases, limited support, and day-to-day quality decisions.',
  },
];

const accessSteps = ['Sign in', 'Review', 'Enter'];

const GoogleMark: React.FC = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
    <path
      fill="#EA4335"
      d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9a6 6 0 1 1 0-12c2.2 0 3.6.9 4.5 1.7l3-2.9C17.7 3.2 15.2 2 12 2a10 10 0 1 0 0 20c5.8 0 9.6-4 9.6-9.7 0-.7-.1-1.2-.2-1.7H12Z"
    />
    <path
      fill="#34A853"
      d="M3.9 7.3 7 9.6A6 6 0 0 1 12 6c2.2 0 3.6.9 4.5 1.7l3-2.9C17.7 3.2 15.2 2 12 2 8.1 2 4.7 4.2 3 7.3Z"
    />
    <path
      fill="#FBBC05"
      d="M12 22c3.1 0 5.7-1 7.6-2.8l-3.5-2.8c-1 .7-2.3 1.2-4.1 1.2-3.8 0-5.1-2.5-5.4-3.8l-3 2.3C5.2 19.6 8.4 22 12 22Z"
    />
    <path
      fill="#4285F4"
      d="M3.9 7.3A10 10 0 0 0 2 12c0 1.6.4 3.2 1.1 4.6l3-2.3A6 6 0 0 1 6 12c0-.8.2-1.7.6-2.4l-2.7-2.3Z"
    />
  </svg>
);

export const LoginScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setError(null);
    setIsLoading(true);

    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code ?? '')
          : '';

      if (code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups for this site and try again.');
      } else if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setError(null);
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Check your connection and try again.');
      } else if (code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized for sign-in. Contact the admin.');
      } else {
        setError('Sign-in failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.45, 0.3] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute left-[-10%] top-[-12%] h-[28rem] w-[28rem] rounded-full bg-primary/12 blur-[140px]"
      />
      <motion.div
        animate={{ scale: [1, 1.18, 1], opacity: [0.16, 0.26, 0.16] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="pointer-events-none absolute bottom-[-16%] right-[-8%] h-[30rem] w-[30rem] rounded-full bg-primary/10 blur-[160px]"
      />
      <div className="pointer-events-none absolute inset-0 dot-grid opacity-[0.18]" />
      <div className="pointer-events-none absolute inset-y-0 left-[8%] hidden w-px bg-border/70 lg:block" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center px-6 py-10 sm:px-8 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="grid w-full gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(24rem,30rem)] lg:gap-14"
        >
          <section className="flex flex-col justify-center gap-9 lg:pr-6">
            <div className="space-y-7">
              <div className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-input px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-primary">
                <span className="status-pulse h-2 w-2 rounded-full bg-primary" />
                Reviewed Membership
              </div>

              <div className="space-y-4">
                <p className="text-sm uppercase tracking-[0.32em] text-muted-foreground">QA Solo Hub</p>
                <h1
                  className="max-w-[13ch] font-headline text-4xl leading-[0.98] text-on-surface sm:text-5xl lg:text-6xl"
                  style={{ fontWeight: 650 }}
                >
                  For solo QA architects who want stronger review and better peer context.
                </h1>
                <p className="max-w-xl text-base leading-7 text-on-surface-variant sm:text-lg">
                  Exchange practical feedback, operating patterns, and decision context with peers doing the same
                  quality work independently.
                </p>
              </div>
            </div>

            <div className="space-y-3.5">
              {credibilitySignals.map(signal => (
                <div key={signal.title} className="flex gap-4 rounded-2xl border border-border/70 bg-background/20 px-4 py-4">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary/80" />
                  <div>
                    <p className="text-sm text-on-surface" style={{ fontWeight: 590 }}>
                      {signal.title}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-on-surface-variant">{signal.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="surface-nested-card rounded-3xl p-5 sm:p-6">
              <div className="flex items-center gap-3 text-sm text-on-surface">
                <Waypoints size={16} className="text-primary" />
                <span style={{ fontWeight: 590 }}>Built for review, critique, and useful decisions.</span>
              </div>
              <p className="mt-3 max-w-xl text-sm leading-6 text-on-surface-variant">
                Bring release risks, fragile workflows, and the tradeoffs behind the work. This space is for
                practitioners who need informed review, not passive participation.
              </p>
            </div>
          </section>

          <section className="relative">
            <div className="absolute inset-0 rounded-[2rem] bg-primary/6 blur-3xl" />
            <div className="surface-primary-card relative rounded-[2rem] p-7 sm:p-10">
              <div className="space-y-7">
                <div className="space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                    <LogIn size={22} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Member Access</p>
                    <h2 className="text-3xl text-on-surface" style={{ fontWeight: 620 }}>
                      Enter QA Solo Hub
                    </h2>
                    <p className="max-w-sm text-sm leading-6 text-on-surface-variant">
                      Sign in with Google to verify your identity. New accounts are reviewed before workspace
                      access is approved.
                    </p>
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    role="alert"
                    aria-live="polite"
                    className="flex items-start gap-2.5 rounded-2xl border border-error/20 bg-error/8 px-4 py-3 text-left"
                  >
                    <AlertCircle size={16} className="mt-0.5 shrink-0 text-error" />
                    <p className="text-sm leading-6 text-error">{error}</p>
                  </motion.div>
                )}

                <button
                  onClick={handleSignIn}
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-on-surface px-4 py-4 text-sm text-surface transition-all duration-150 hover:opacity-92 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ fontWeight: 610 }}
                >
                  {isLoading ? (
                    <div
                      className="h-4 w-4 animate-spin rounded-full border-2 border-surface/25 border-t-surface"
                      aria-hidden="true"
                    />
                  ) : (
                    <GoogleMark />
                  )}
                  <span>{isLoading ? 'Signing in...' : 'Continue with Google'}</span>
                </button>

                <div className="border-t border-border/70 pt-4">
                  <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                    <ShieldCheck size={14} className="text-primary" />
                    Access flow
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {accessSteps.map((step, index) => (
                      <div key={step} className="rounded-xl border border-border/70 bg-background/30 px-3 py-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">0{index + 1}</p>
                        <p className="mt-2 text-sm text-on-surface" style={{ fontWeight: 590 }}>
                          {step}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-start justify-between gap-4 border-t border-border pt-4">
                  <p className="max-w-xs text-xs leading-5 text-on-surface-variant">
                    Access is granted via peer review to protect signal quality and keep discussions grounded in real
                    practice.
                  </p>
                  <p className="max-w-[8rem] text-right text-xs leading-5 text-muted-foreground/90" style={{ fontWeight: 590 }}>
                    Approval protects the quality of discussion.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
};

export const PendingApprovalScreen: React.FC = () => {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6 text-center relative overflow-hidden">
      <div className="absolute inset-0 bg-primary/3 pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full bg-surface-container-low rounded-3xl p-8 shadow-xl border border-outline-variant/10 space-y-8 relative z-10"
      >
        {profile?.status === 'rejected' ? (
          <>
            <div className="w-20 h-20 bg-error/10 rounded-3xl flex items-center justify-center mx-auto">
              <ShieldAlert size={40} className="text-error" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-on-surface">Access Denied</h1>
              <p className="text-on-surface-variant">
                Your request to join QA Solo Hub has been declined. If you believe this is a mistake, please contact
                the administrator.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="relative w-20 h-20 mx-auto">
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.1, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 bg-primary/20 rounded-3xl"
              />
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center relative z-10">
                <Clock size={40} className="text-primary" />
              </div>
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-bold text-on-surface">Pending Approval</h1>
              <p className="text-on-surface-variant">
                Hi <span className="font-bold text-on-surface">{profile?.displayName?.split(' ')[0]}</span>! Your QA
                Solo Hub account is awaiting admin review.
              </p>
              <div className="bg-primary/5 border border-primary/10 rounded-2xl px-4 py-3 flex items-center gap-3 text-left">
                <Mail size={16} className="text-primary shrink-0" />
                <p className="text-xs text-on-surface-variant">
                  You&apos;ll receive an email notification once your account is activated. This usually takes less
                  than 24 hours.
                </p>
              </div>
            </div>
          </>
        )}
        <button
          onClick={logout}
          className="text-sm font-bold text-outline hover:text-on-surface transition-colors"
        >
          Sign out and try another account
        </button>
      </motion.div>
    </div>
  );
};

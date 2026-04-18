import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { motion, useReducedMotion } from 'motion/react';
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
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0">
    <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9a6 6 0 1 1 0-12c2.2 0 3.6.9 4.5 1.7l3-2.9C17.7 3.2 15.2 2 12 2a10 10 0 1 0 0 20c5.8 0 9.6-4 9.6-9.7 0-.7-.1-1.2-.2-1.7H12Z" />
    <path fill="#34A853" d="M3.9 7.3 7 9.6A6 6 0 0 1 12 6c2.2 0 3.6.9 4.5 1.7l3-2.9C17.7 3.2 15.2 2 12 2 8.1 2 4.7 4.2 3 7.3Z" />
    <path fill="#FBBC05" d="M12 22c3.1 0 5.7-1 7.6-2.8l-3.5-2.8c-1 .7-2.3 1.2-4.1 1.2-3.8 0-5.1-2.5-5.4-3.8l-3 2.3C5.2 19.6 8.4 22 12 22Z" />
    <path fill="#4285F4" d="M3.9 7.3A10 10 0 0 0 2 12c0 1.6.4 3.2 1.1 4.6l3-2.3A6 6 0 0 1 6 12c0-.8.2-1.7.6-2.4l-2.7-2.3Z" />
  </svg>
);

export const LoginScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reduce = useReducedMotion();

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

  const stagger = reduce ? 0 : 0.08;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Ambient glows */}
      <motion.div
        animate={reduce ? {} : { scale: [1, 1.1, 1], opacity: [0.25, 0.4, 0.25] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute left-[-10%] top-[-12%] h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-[140px]"
      />
      <motion.div
        animate={reduce ? {} : { scale: [1, 1.18, 1], opacity: [0.12, 0.22, 0.12] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="pointer-events-none absolute bottom-[-16%] right-[-8%] h-[30rem] w-[30rem] rounded-full bg-primary/8 blur-[160px]"
      />
      <div className="pointer-events-none absolute inset-0 dot-grid opacity-[0.15]" />
      <div className="pointer-events-none absolute inset-y-0 left-[8%] hidden w-px bg-border/50 lg:block" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center px-6 py-10 sm:px-8 lg:px-10">
        <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(24rem,30rem)] lg:gap-14">

          {/* Left — copy + credibility */}
          <section className="flex flex-col justify-center gap-8 lg:pr-6">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-secondary/60 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-primary">
                <span className="status-pulse h-2 w-2 rounded-full bg-primary" />
                Reviewed Membership
              </div>

              <div className="space-y-4">
                <p className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">QA Solo Hub</p>
                <h1
                  className="max-w-[13ch] font-headline text-4xl leading-[0.98] text-foreground sm:text-5xl lg:text-6xl"
                  style={{ fontWeight: 650 }}
                >
                  For solo QA architects who want stronger review and better peer context.
                </h1>
                <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                  Exchange practical feedback, operating patterns, and decision context with peers doing the same
                  quality work independently.
                </p>
              </div>
            </motion.div>

            {/* Credibility signals — staggered entrance + hover lift */}
            <div className="space-y-3">
              {credibilitySignals.map((signal, i) => (
                <motion.div
                  key={signal.title}
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + i * stagger, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={reduce ? {} : { y: -2, transition: { duration: 0.15 } }}
                  className="flex gap-4 rounded-[14px] border border-border/60 bg-secondary/25 px-4 py-4 cursor-default hover:border-primary/20 hover:bg-secondary/50 transition-colors"
                >
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                  <div>
                    <p className="text-[13px] text-foreground" style={{ fontWeight: 590 }}>
                      {signal.title}
                    </p>
                    <p className="mt-1 text-[13px] leading-6 text-muted-foreground">{signal.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="surface-nested-card rounded-[20px] p-5 sm:p-6"
            >
              <div className="flex items-center gap-3 text-[13px] text-foreground">
                <Icon icon="solar:routing-bold-duotone" width={16} height={16} className="text-primary shrink-0" />
                <span style={{ fontWeight: 590 }}>Built for review, critique, and useful decisions.</span>
              </div>
              <p className="mt-3 max-w-xl text-[13px] leading-6 text-muted-foreground">
                Bring release risks, fragile workflows, and the tradeoffs behind the work. This space is for
                practitioners who need informed review, not passive participation.
              </p>
            </motion.div>
          </section>

          {/* Right — auth card */}
          <motion.section
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className="absolute inset-0 rounded-[28px] bg-primary/8 blur-3xl" />
            <div className="relative rounded-[24px] border border-border bg-card p-7 shadow-[0_1px_2px_rgba(26,23,20,0.04),0_12px_32px_rgba(26,23,20,0.08)] sm:p-10">
              <div className="space-y-6">
                {/* Icon + heading */}
                <div className="space-y-4">
                  <motion.div
                    initial={reduce ? false : { scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.35, delay: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
                    className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-primary/12 text-primary"
                  >
                    <Icon icon="solar:login-bold-duotone" width={22} height={22} />
                  </motion.div>
                  <div className="space-y-1.5">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Member Access</p>
                    <h2 className="text-[28px] text-foreground leading-tight" style={{ fontWeight: 620 }}>
                      Enter QA Solo Hub
                    </h2>
                    <p className="max-w-sm text-[13px] leading-6 text-muted-foreground">
                      Sign in with Google to verify your identity. New accounts are reviewed before workspace
                      access is approved.
                    </p>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    role="alert"
                    aria-live="polite"
                    className="flex items-start gap-2.5 rounded-[12px] border border-destructive/20 bg-destructive/6 px-4 py-3 text-left"
                  >
                    <Icon icon="solar:danger-circle-bold-duotone" width={16} height={16} className="mt-0.5 shrink-0 text-destructive" />
                    <p className="text-[13px] leading-6 text-destructive">{error}</p>
                  </motion.div>
                )}

                {/* Google button */}
                <motion.button
                  onClick={handleSignIn}
                  disabled={isLoading}
                  data-testid="login-google-button"
                  whileTap={reduce ? {} : { scale: 0.97 }}
                  whileHover={reduce ? {} : { opacity: 0.92 }}
                  className="flex w-full items-center justify-center gap-3 rounded-[14px] bg-foreground px-4 py-3.5 text-[13px] text-background shadow-sm transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ fontWeight: 610 }}
                >
                  {isLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-background/25 border-t-background" aria-hidden="true" />
                  ) : (
                    <GoogleMark />
                  )}
                  <span>{isLoading ? 'Signing in…' : 'Continue with Google'}</span>
                </motion.button>

                {/* Access flow */}
                <div className="border-t border-border pt-4 space-y-3">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                    <Icon icon="solar:shield-check-bold-duotone" width={13} height={13} className="text-primary" />
                    Access flow
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {accessSteps.map((step, index) => (
                      <motion.div
                        key={step}
                        initial={reduce ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.4 + index * 0.07, ease: 'easeOut' }}
                        className="rounded-[10px] border border-border bg-secondary/30 px-3 py-3"
                      >
                        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">0{index + 1}</p>
                        <p className="mt-1.5 text-[13px] text-foreground" style={{ fontWeight: 590 }}>
                          {step}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Footer note */}
                <div className="flex items-start justify-between gap-4 border-t border-border pt-4">
                  <p className="max-w-xs text-[11px] leading-5 text-muted-foreground">
                    Access is granted via peer review to protect signal quality and keep discussions grounded in real
                    practice.
                  </p>
                  <p className="max-w-[8rem] text-right text-[11px] leading-5 text-muted-foreground/70" style={{ fontWeight: 590 }}>
                    Approval protects the quality of discussion.
                  </p>
                </div>
              </div>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
};

export const PendingApprovalScreen: React.FC = () => {
  const { profile } = useAuth();
  const reduce = useReducedMotion();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Ambient glow */}
      <motion.div
        animate={reduce ? {} : { scale: [1, 1.1, 1], opacity: [0.15, 0.25, 0.15] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div className="h-[32rem] w-[32rem] rounded-full bg-primary/8 blur-[120px]" />
      </motion.div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-md w-full bg-card rounded-[24px] p-8 shadow-[0_1px_2px_rgba(26,23,20,0.04),0_12px_32px_rgba(26,23,20,0.08)] border border-border space-y-7 relative z-10"
      >
        {profile?.status === 'rejected' ? (
          <>
            <motion.div
              initial={reduce ? false : { scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
              className="w-20 h-20 bg-destructive/10 rounded-[20px] flex items-center justify-center mx-auto"
            >
              <Icon icon="solar:shield-warning-bold-duotone" width={40} height={40} className="text-destructive" />
            </motion.div>
            <div className="space-y-2">
              <h1 className="text-[28px] text-foreground" style={{ fontWeight: 650 }}>Access Denied</h1>
              <p className="text-[13px] leading-6 text-muted-foreground">
                Your request to join QA Solo Hub has been declined. If you believe this is a mistake, please contact
                the administrator.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="relative w-20 h-20 mx-auto">
              <motion.div
                animate={reduce ? {} : { scale: [1, 1.35, 1], opacity: [0.35, 0.08, 0.35] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 bg-primary/20 rounded-[20px]"
              />
              <motion.div
                initial={reduce ? false : { scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
                className="w-20 h-20 bg-primary/10 rounded-[20px] flex items-center justify-center relative z-10"
              >
                <Icon icon="solar:clock-circle-bold-duotone" width={40} height={40} className="text-primary" />
              </motion.div>
            </div>
            <div className="space-y-3">
              <h1 className="text-[28px] text-foreground" style={{ fontWeight: 650 }}>Pending Approval</h1>
              <p className="text-[13px] leading-6 text-muted-foreground">
                Hi <span className="text-foreground" style={{ fontWeight: 640 }}>{profile?.displayName?.split(' ')[0]}</span>! Your QA
                Solo Hub account is awaiting admin review.
              </p>
              <div className="bg-primary/5 border border-primary/12 rounded-[12px] px-4 py-3 flex items-start gap-3 text-left">
                <Icon icon="solar:letter-bold-duotone" width={16} height={16} className="text-primary shrink-0 mt-0.5" />
                <p className="text-[12px] leading-5 text-muted-foreground">
                  You'll receive an email notification once your account is activated. This usually takes less
                  than 24 hours.
                </p>
              </div>
            </div>
          </>
        )}
        <motion.button
          onClick={logout}
          whileHover={reduce ? {} : { opacity: 0.7 }}
          whileTap={reduce ? {} : { scale: 0.97 }}
          className="text-[12px] text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-[4px]"
          style={{ fontWeight: 590 }}
        >
          Sign out and try another account
        </motion.button>
      </motion.div>
    </div>
  );
};

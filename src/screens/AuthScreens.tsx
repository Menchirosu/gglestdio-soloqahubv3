import React, { useState } from 'react';
import { LogIn, Clock, ShieldAlert, Mail, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { signInWithGoogle, logout } from '../firebase';
import { useAuth } from '../AuthContext';

export const LoginScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      // Map Firebase error codes to readable messages
      const code = err?.code ?? '';
      if (code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups for this site and try again.');
      } else if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // User dismissed — not really an error, just reset
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
    <div className="min-h-screen bg-surface flex items-center justify-center p-6 relative overflow-hidden">
      {/* Animated gradient backdrop */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[140px] pointer-events-none"
      />
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/8 rounded-full blur-[120px] pointer-events-none"
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative z-10 flex flex-col items-center gap-6 w-full max-w-md"
      >
        {/* Wordmark */}
        <div className="text-center space-y-1">
          <p className="text-3xl font-black tracking-tight text-primary font-headline">QHUB</p>
          <p className="text-[10px] uppercase tracking-[0.3em] text-tertiary font-bold">QA Community Hub</p>
        </div>

        <div className="w-full bg-surface-container-low rounded-[12px] p-8 shadow-xl border border-outline-variant/10 text-center space-y-6">
          <div className="w-16 h-16 bg-primary/10 rounded-[8px] flex items-center justify-center mx-auto">
            <LogIn size={32} className="text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl text-on-surface" style={{ fontWeight: 590 }}>Welcome to QA Hub</h1>
            <p className="text-sm text-on-surface-variant">The exclusive space for solo QA architects to share, learn, and grow.</p>
          </div>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2.5 rounded-[6px] border border-error/20 bg-error/8 px-3 py-2.5 text-left"
            >
              <AlertCircle size={15} className="text-error shrink-0 mt-0.5" />
              <p className="text-[12px] text-error">{error}</p>
            </motion.div>
          )}

          <button
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full py-3 bg-on-surface text-surface text-sm font-[590] rounded-[6px] flex items-center justify-center gap-2.5 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-4 h-4 rounded-full border-2 border-surface/30 border-t-surface animate-spin" />
            ) : (
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
            )}
            {isLoading ? 'Signing in…' : 'Sign in with Google'}
          </button>

          <p className="text-[11px] text-on-surface-variant/60">
            By signing in you agree to our community guidelines.
          </p>
        </div>
      </motion.div>
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
              <p className="text-on-surface-variant">Your request to join the QA Hub has been declined. If you believe this is a mistake, please contact the administrator.</p>
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
              <p className="text-on-surface-variant">Hi <span className="font-bold text-on-surface">{profile?.displayName?.split(' ')[0]}</span>! Your account is awaiting admin review.</p>
              <div className="bg-primary/5 border border-primary/10 rounded-2xl px-4 py-3 flex items-center gap-3 text-left">
                <Mail size={16} className="text-primary shrink-0" />
                <p className="text-xs text-on-surface-variant">You'll receive an email notification once your account is activated. This usually takes less than 24 hours.</p>
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

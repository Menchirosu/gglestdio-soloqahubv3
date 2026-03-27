import React from 'react';
import { LogIn, Clock, ShieldAlert, Mail } from 'lucide-react';
import { motion } from 'motion/react';
import { signInWithGoogle, logout } from '../firebase';
import { useAuth } from '../AuthContext';

export const LoginScreen: React.FC = () => {
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
        {/* Wordmark above card */}
        <div className="text-center space-y-1">
          <p className="text-3xl font-black tracking-tight text-primary font-headline">QHUB</p>
          <p className="text-[10px] uppercase tracking-[0.3em] text-tertiary font-bold">QA Community Hub</p>
        </div>

        <div className="w-full bg-surface-container-low rounded-3xl p-8 shadow-xl border border-outline-variant/10 text-center space-y-8">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto">
            <LogIn size={40} className="text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-on-surface">Welcome to QA Hub</h1>
            <p className="text-on-surface-variant">The exclusive space for solo QA architects to share, learn, and grow.</p>
          </div>
          <button
            onClick={signInWithGoogle}
            className="w-full py-4 bg-on-surface text-surface font-bold rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Sign in with Google
          </button>
          <p className="text-xs text-outline">By signing in, you agree to our community guidelines and privacy policy.</p>
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

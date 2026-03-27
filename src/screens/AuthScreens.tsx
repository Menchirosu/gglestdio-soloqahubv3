import React from 'react';
import { LogIn, Clock, ShieldAlert } from 'lucide-react';
import { signInWithGoogle, logout } from '../firebase';
import { useAuth } from '../AuthContext';

export const LoginScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle background blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-secondary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-md">
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
      </div>
    </div>
  );
};

export const PendingApprovalScreen: React.FC = () => {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-surface-container-low rounded-3xl p-8 shadow-xl border border-outline-variant/10 space-y-8">
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
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto">
              <Clock size={40} className="text-primary animate-pulse" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-on-surface">Waiting for Approval</h1>
              <p className="text-on-surface-variant">Thanks for joining, <span className="font-bold text-on-surface">{profile?.displayName}</span>! Your request is currently pending approval from the administrator.</p>
              <p className="text-sm text-outline mt-4">We'll notify you once your account is activated.</p>
            </div>
          </>
        )}
        <button 
          onClick={logout}
          className="text-sm font-bold text-outline hover:text-on-surface transition-colors"
        >
          Sign out and try another account
        </button>
      </div>
    </div>
  );
};

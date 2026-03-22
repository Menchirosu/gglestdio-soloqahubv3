import { useState, useEffect } from 'react';

export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  return { toast, showToast };
}

export function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div className={`fixed bottom-8 right-8 px-6 py-3 rounded-xl shadow-2xl z-50 animate-in slide-in-from-bottom-4 duration-300 ${
      type === 'success' ? 'bg-primary text-white' : 'bg-error text-white'
    }`}>
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
        <p className="font-bold text-sm">{message}</p>
      </div>
    </div>
  );
}

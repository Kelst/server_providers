'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { Loader2 } from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, checkAuth, _hasHydrated } = useAuthStore();

  useEffect(() => {
    // Only check auth after hydration is complete and if authenticated
    if (_hasHydrated && isAuthenticated) {
      checkAuth();
    }
  }, [checkAuth, _hasHydrated, isAuthenticated]);

  useEffect(() => {
    // Redirect to login if not authenticated (only after hydration)
    if (_hasHydrated && !isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router, _hasHydrated]);

  // Show loading while hydrating or checking auth
  if (!_hasHydrated || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show nothing if not authenticated (redirecting)
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

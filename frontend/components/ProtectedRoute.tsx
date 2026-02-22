'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * ProtectedRoute component that checks authentication state
 * and redirects unauthenticated users to the login page.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    const redirectUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
    router.push(redirectUrl);
    return null;
  }

  // Render children for authenticated users
  return <>{children}</>;
}

export default ProtectedRoute;

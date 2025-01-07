'use client';

import { AuthProvider } from '@/contexts/auth-context';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="min-h-full">
        {children}
      </div>
    </AuthProvider>
  );
} 
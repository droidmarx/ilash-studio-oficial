"use client"
import React from 'react';
import SuperAdminSidebar from '@/components/admin/SuperAdminSidebar';
import SuperAdminGuard from '@/components/admin/SuperAdminGuard';
import { useAuth } from '@/hooks/use-auth';

import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  
  // Assegurando fallback com sintaxe segura anti-crash
  const displayUser = user || { email: 'Admin' };

  return (
    <ErrorBoundary>
      <SuperAdminGuard>
        <div className="flex min-h-screen bg-background text-foreground overflow-x-hidden w-full">
          {/* Sidebar */}
          <SuperAdminSidebar user={displayUser} />
          
          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto animate-in fade-in duration-700">
              {children}
            </div>
          </main>
        </div>
      </SuperAdminGuard>
    </ErrorBoundary>
  );
}


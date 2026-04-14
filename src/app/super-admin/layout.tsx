"use client"
import React from 'react';
import SuperAdminSidebar from '@/components/admin/SuperAdminSidebar';
import SuperAdminGuard from '@/components/admin/SuperAdminGuard';
import { useAuth } from '@/hooks/use-auth';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const displayUser = user || { email: 'Admin' };

  return (
    <SuperAdminGuard>
      <div className="flex min-h-screen bg-background text-foreground">
        {/* Sidebar */}
        <SuperAdminSidebar user={displayUser} />
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-8 lg:p-12 max-w-7xl mx-auto animate-in fade-in duration-700">
            {children}
          </div>
        </main>
      </div>
    </SuperAdminGuard>
  );
}

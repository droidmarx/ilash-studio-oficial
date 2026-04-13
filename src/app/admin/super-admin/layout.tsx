import React from 'react';
import SuperAdminSidebar from '@/components/admin/SuperAdminSidebar';
import SuperAdminGuard from '@/components/admin/SuperAdminGuard';
import { supabase } from '@/lib/supabase';

// Nota: Em Next.js 13+, para usar o useAuth no context, o layout pode permanecer um server component
// mas o Guard vai rodar no cliente.

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Simulando o user para o Sidebar (o Guard fará a verificação real)
  // No servidor não temos o user facilmente sem SSR, mas o Guard no cliente redirecionará se necessário.
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user || { email: 'Admin' };

  return (
    <SuperAdminGuard>
      <div className="flex min-h-screen bg-background text-foreground">
        {/* Sidebar */}
        <SuperAdminSidebar user={user} />
        
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

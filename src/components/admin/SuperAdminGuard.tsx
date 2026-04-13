"use client"

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthContext';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkRole() {
      if (authLoading) return;
      
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('perfis')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error || data?.role !== 'super_admin') {
          console.error("Acesso negado: Não é super_admin", error);
          router.push('/admin'); // Redireciona para o admin comum
          return;
        }

        setIsAuthorized(true);
      } catch (err) {
        console.error("Erro ao verificar autorização:", err);
        router.push('/admin');
      }
    }

    checkRole();
  }, [user, authLoading, router]);

  if (authLoading || isAuthorized === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-sm font-black uppercase tracking-widest text-primary/40 animate-pulse">
            Verificando Credenciais...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

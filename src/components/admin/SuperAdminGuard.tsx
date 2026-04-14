"use client"

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
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
        router.replace('/login');
        return;
      }

      try {
        console.log("[SuperAdminGuard] Verificando role para usuário:", user.id);
        const { data, error } = await supabase
          .from('perfis')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error("[SuperAdminGuard] Erro ao buscar role:", error.message);
          setIsAuthorized(false);
          router.replace('/admin');
          return;
        }

        console.log("[SuperAdminGuard] Role encontrada:", data?.role);

        if (data?.role !== 'super_admin' && user.email !== 'droidmarx@gmail.com') {
          console.warn("[SuperAdminGuard] Acesso negado: Usuário não é super_admin");
          setIsAuthorized(false);
          router.replace('/admin');
          return;
        }

        setIsAuthorized(true);
      } catch (err) {
        console.error("[SuperAdminGuard] Erro inesperado na autorização:", err);
        setIsAuthorized(false);
        router.replace('/admin');
      }
    }

    checkRole();
  }, [user, authLoading, router]);

  if (authLoading || isAuthorized === null || isAuthorized === false) {
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

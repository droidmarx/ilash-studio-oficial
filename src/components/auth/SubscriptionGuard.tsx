"use client"

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

/** Rotas públicas — não exigem login nem assinatura */
function isPublicPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname === '/login' ||
    pathname === '/register' ||
    pathname.startsWith('/s/') ||
    pathname === '/s' ||
    pathname.startsWith('/anamnese/') ||
    pathname.startsWith('/admin')
  );
}

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  // impersonatedUser pode não existir no AuthContext; evita quebra
  const effectiveUserId = (user as any)?.impersonatedUser?.id || user?.id;
  const router = useRouter();
  const pathname = usePathname();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Bypass total para rotas públicas (link de agendamento, login, anamnese, etc.)
  if (isPublicPath(pathname)) {
    return <>{children}</>;
  }

  useEffect(() => {
    if (isPublicPath(pathname)) {
      return;
    }

    if (authLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    const checkAccess = async () => {
      const { data: profile } = await supabase
        .from('perfis')
        .select('subscription_status, trial_end, role')
        .eq('id', effectiveUserId)
        .single();
        
      if (!profile) {
        setHasAccess(false);
        await supabase.auth.signOut();
        router.push('/login');
        return;
      }

      setIsAdmin(profile.role === 'admin');

      const now = new Date();
      const trialEnd = profile.trial_end ? new Date(profile.trial_end) : null;
      let access = false;

      if (profile.role === 'admin') {
        access = true;
      } else if (profile.subscription_status === 'authorized') {
        access = true;
      } else if (trialEnd && trialEnd > now && profile.subscription_status === 'trial') {
        access = true;
      }
      
      setHasAccess(access);

      if (!access && pathname !== '/subscription' && !pathname?.startsWith('/admin')) {
        router.replace('/subscription');
      } else if (pathname?.startsWith('/admin') && profile.role !== 'admin') {
        router.replace('/');
      }
    };

    checkAccess();
  }, [user, authLoading, pathname, router, effectiveUserId]);

  if (authLoading || (user && hasAccess === null)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-semibold tracking-widest text-primary/70">VERIFICANDO ACESSO...</p>
        </div>
      </div>
    );
  }

  // Se não tem acesso e não está na tela de subscription, não renderiza pra evitar piscar
  if (user && hasAccess === false && pathname !== '/subscription') {
    return null;
  }

  // Se tenta acessar admin sem ser admin
  if (pathname?.startsWith('/admin') && !isAdmin) {
    return null;
  }

  return <>{children}</>;
}

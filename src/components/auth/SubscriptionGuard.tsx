"use client"

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      if (pathname !== '/login' && pathname !== '/register') {
        router.push('/login');
      }
      return;
    }

    const checkAccess = async () => {
      // In a real scenario we could hit /api/subscription/status 
      // but since we are client-side we can just query supabase directly here
      // if RLS allows reading own profile
      
      const { data: profile } = await supabase
        .from('perfis')
        .select('subscription_status, trial_end, role')
        .eq('id', user.id)
        .single();
        
      if (!profile) {
        setHasAccess(false);
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

      if (!access && pathname !== '/subscription' && !pathname.startsWith('/admin')) {
        router.push('/subscription');
      } else if (pathname.startsWith('/admin') && profile.role !== 'admin') {
        // Protect /admin
        router.push('/');
      }
    };

    checkAccess();
  }, [user, authLoading, pathname, router]);

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
  if (pathname.startsWith('/admin') && !isAdmin) {
    return null;
  }

  return <>{children}</>;
}

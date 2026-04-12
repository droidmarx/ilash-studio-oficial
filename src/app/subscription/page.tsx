"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Crown, CheckCircle2, ShieldCheck, Zap, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SubscriptionStatus {
  status: string;
  trial_end: string | null;
  has_access: boolean;
  role: string;
  plan: string;
}

export default function SubscriptionPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/subscription/status', {
          headers: {
             // Simulating auth header since we might be on client sending to Next.js API. 
             // Normally Next.js API gets session from cookies with @supabase/ssr, 
             // but here we manually pass the token since we use supabase-js client
             'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
        } else {
           throw new Error('Failed to fetch status');
        }
      } catch (error) {
        console.error(error);
        toast({ title: 'Erro', description: 'Não foi possível carregar o status.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    // Need to import supabase for the token fix above.
    // Let me dynamically import or just use the global one if possible. 
    // It's better to fetch status.
    import('@/lib/supabase').then(({ supabase }) => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if(session) {
          fetch('/api/subscription/status', {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          })
          .then(res => res.json())
          .then(data => setStatus(data))
          .catch(err => {
             console.error(err);
             toast({ title: 'Erro', description: 'Não foi possível carregar o status.', variant: 'destructive' });
          })
          .finally(() => setLoading(false));
        } else {
          setLoading(false);
        }
      });
    });

  }, [user, authLoading, router, toast]);

  const handleUpgrade = async () => {
    setCheckoutLoading(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) throw new Error('Not authenticated');

      const response = await fetch('/api/subscription/create', {
        method: 'POST',
        headers: {
           'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      const data = await response.json();
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        throw new Error(data.error || 'Failed to create checkout');
      }
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro de Pagamento', description: 'Ocorreu um erro ao gerar o checkout.', variant: 'destructive' });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const isTrial = status?.status === 'trial';
  const isAuthorized = status?.status === 'authorized';
  const isAdmin = status?.role === 'admin';
  const hasAccess = status?.has_access;
  
  let trialDaysLeft = 0;
  if (isTrial && status?.trial_end) {
     const trialEnd = new Date(status.trial_end);
     trialDaysLeft = differenceInDays(trialEnd, new Date());
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-4xl z-10 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gold-gradient shadow-2xl mb-4">
            <Crown className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-5xl md:text-6xl font-headline text-gold-gradient">Sua Jornada Premium</h1>
          <p className="text-primary/60 tracking-widest uppercase text-sm font-bold">Gestão Inteligente para Lash Designers</p>
        </div>

        <Card className="border-primary/20 bg-card/60 backdrop-blur-3xl shadow-2xl rounded-[3rem] overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">
            <div className="p-10 md:p-14 space-y-8 border-b md:border-b-0 md:border-r border-primary/10">
              <div className="space-y-2">
                <h2 className="text-3xl font-headline text-foreground">Status Atual</h2>
                
                {isAdmin ? (
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-primary text-sm font-bold tracking-widest uppercase">
                    <ShieldCheck size={16} /> Acesso Administrador
                  </div>
                ) : isAuthorized ? (
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/20 border border-green-500/30 text-green-500 text-sm font-bold tracking-widest uppercase">
                    <CheckCircle2 size={16} /> Assinatura Ativa
                  </div>
                ) : isTrial && trialDaysLeft >= 0 ? (
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-500 text-sm font-bold tracking-widest uppercase">
                    <Zap size={16} /> Período de Teste ({trialDaysLeft} dias restantes)
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-destructive/20 border border-destructive/30 text-destructive text-sm font-bold tracking-widest uppercase">
                    Acesso Expirado
                  </div>
                )}
              </div>

              {!isAdmin && !isAuthorized && (
                 <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 space-y-3">
                   <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                     {trialDaysLeft >= 0 ? 
                       "Aproveite todos os recursos premium durante seu período de teste. Não deixe para a última hora!" : 
                       "Seu período de acesso terminou. Desbloqueie sua agenda e continue prosperando."}
                   </p>
                 </div>
              )}

              <div className="space-y-4 pt-4">
                {hasAccess && (
                  <Button 
                    variant="outline" 
                    className="w-full h-14 rounded-full border-primary/30 hover:bg-primary/10 font-bold tracking-wider text-primary"
                    onClick={() => router.push('/')}
                  >
                    ACESSAR MEU STUDIO
                  </Button>
                )}
                
                <Button 
                  variant="ghost" 
                  className="w-full h-12 rounded-full text-foreground/50 hover:text-destructive hover:bg-destructive/10"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2" size={18} /> Sair
                </Button>
              </div>
            </div>

            <div className="p-10 md:p-14 bg-muted/30 space-y-8 flex flex-col justify-center">
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-primary/60 tracking-widest uppercase">Plano I Lash Studio</h3>
                <div className="flex items-baseline gap-2">
                   <span className="text-6xl font-headline text-gold-gradient text-transparent bg-clip-text">14,99</span>
                   <span className="text-xl font-bold text-muted-foreground">/mês</span>
                </div>
              </div>

              <ul className="space-y-4">
                {[
                  "Agenda inteligente com temas exclusivos",
                  "Lembretes automáticos pelo Telegram",
                  "Gestão completa de clientes e finanças",
                  "Link de agendamento online personalizado"
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm font-medium text-foreground/80">{feature}</span>
                  </li>
                ))}
              </ul>

              {(!isAdmin && !isAuthorized) && (
                <Button 
                  className="w-full h-16 rounded-full bg-gold-gradient text-primary-foreground font-black tracking-widest shadow-[0_0_30px_rgba(var(--primary),0.3)] hover:scale-105 transition-transform text-lg mt-4"
                  onClick={handleUpgrade}
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? <Loader2 className="animate-spin" /> : "ASSINAR AGORA"}
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

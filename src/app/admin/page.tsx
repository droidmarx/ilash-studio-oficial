"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthContext';
import { fetchUsers, fetchPlan, updatePlanPrice, extendTrial, banUser } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldAlert, CheckCircle2, Clock, Ban } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<any[]>([]);
  const [plan, setPlan] = useState<any>(null);
  const [newPrice, setNewPrice] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [token, setToken] = useState('');

  // Admin Login State
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const savedAuth = sessionStorage.getItem('admin_auth');
    if (savedAuth === 'true') {
      setIsAuthorized(true);
    }
    
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    import('@/lib/supabase').then(({ supabase }) => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if(session) {
          setToken(session.access_token);
          loadData(session.access_token);
        } else {
          router.push('/login');
        }
      });
    });
  }, [user, authLoading, router]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUser === 'admin' && adminPass === 'ilash105046') {
      setIsAuthorized(true);
      sessionStorage.setItem('admin_auth', 'true');
      toast({ title: 'Acesso Autorizado', description: 'Bem-vindo ao painel de controle.' });
    } else {
      toast({ title: 'Erro de Acesso', description: 'Usuário ou senha incorretos.', variant: 'destructive' });
    }
  };

  const loadData = async (accessToken: string) => {
    try {
      setLoading(true);
      const [usersData, planData] = await Promise.all([
         fetchUsers(accessToken),
         fetchPlan(accessToken)
      ]);
      setUsers(usersData);
      setPlan(planData);
      setNewPrice(planData?.price?.toString() || '');
    } catch (error) {
      console.error(error);
      toast({ title: 'Acesso Negado', description: 'Você não tem permissão para acessar esta página.', variant: 'destructive' });
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePrice = async () => {
    if (!newPrice) return;
    setActionLoading('price');
    try {
      await updatePlanPrice(token, parseFloat(newPrice));
      toast({ title: 'Sucesso', description: 'Preço atualizado com sucesso.' });
      loadData(token);
    } catch (error) {
       toast({ title: 'Erro', description: 'Falha ao atualizar preço.', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleExtendTrial = async (userId: string) => {
    setActionLoading(`extend-${userId}`);
    try {
      await extendTrial(token, userId);
      toast({ title: 'Sucesso', description: 'Mais 30 dias concedidos.' });
      loadData(token);
    } catch (error) {
       toast({ title: 'Erro', description: 'Falha ao estender trial.', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleBanUser = async (userId: string) => {
    if(!confirm("Tem certeza que deseja banir este usuário?")) return;
    setActionLoading(`ban-${userId}`);
    try {
      await banUser(token, userId);
      toast({ title: 'Sucesso', description: 'Usuário banido.' });
      loadData(token);
    } catch (error) {
       toast({ title: 'Erro', description: 'Falha ao banir usuário.', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md bg-card/60 backdrop-blur-3xl border-primary/20 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
          <CardHeader className="text-center space-y-2 pb-8">
            <div className="mx-auto w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mb-2">
              <ShieldAlert className="text-primary w-10 h-10" />
            </div>
            <CardTitle className="text-3xl font-headline text-gold-gradient">Acesso Restrito</CardTitle>
            <p className="text-xs tracking-widest uppercase text-muted-foreground">Área Administrativa do I Lash Studio</p>
          </CardHeader>
          <CardContent className="p-8 pt-0">
            <form onSubmit={handleAdminLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-primary/60">Usuário</label>
                <Input 
                  value={adminUser}
                  onChange={e => setAdminUser(e.target.value)}
                  className="bg-background/50 border-primary/10 h-12 rounded-xl focus:border-primary/40 focus:ring-0"
                  placeholder="Seu usuário"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-primary/60">Senha</label>
                <Input 
                  type="password"
                  value={adminPass}
                  onChange={e => setAdminPass(e.target.value)}
                  className="bg-background/50 border-primary/10 h-12 rounded-xl focus:border-primary/40 focus:ring-0"
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" className="w-full h-14 rounded-2xl bg-gold-gradient text-primary-foreground font-black tracking-widest text-lg hover:scale-[1.02] transition-transform">
                ENTRAR NO PAINEL
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 border-b border-primary/20 pb-4">
        <ShieldAlert className="text-primary w-10 h-10" />
        <div>
          <h1 className="text-4xl font-headline text-gold-gradient">Painel de Controle Administrador</h1>
          <p className="text-sm tracking-widest uppercase text-muted-foreground">Gerenciamento completo da plataforma</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <Card className="bg-card/60 backdrop-blur-3xl border-primary/20 rounded-3xl h-fit">
          <CardHeader>
            <CardTitle className="text-xl text-primary">Configurações do Plano</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Preço Mensal (R$)</label>
              <div className="flex gap-2">
                <Input 
                  type="number" 
                  step="0.01" 
                  value={newPrice} 
                  onChange={e => setNewPrice(e.target.value)}
                  className="bg-background border-primary/20 rounded-xl"
                />
                <Button 
                  onClick={handleUpdatePrice} 
                  disabled={actionLoading === 'price'}
                  className="bg-primary hover:bg-primary/80 text-primary-foreground rounded-xl"
                >
                  {actionLoading === 'price' ? <Loader2 className="animate-spin w-4 h-4" /> : 'Salvar'}
                </Button>
              </div>
            </div>
            
            <div className="pt-4 border-t border-primary/10 text-sm space-y-2 text-muted-foreground">
               <p><strong>Plano Ativo:</strong> {plan?.name}</p>
               <p><strong>Total Usuários:</strong> {users.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 bg-card/60 backdrop-blur-3xl border-primary/20 rounded-3xl overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xl text-primary">Usuários Cadastrados</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-primary/5 uppercase text-xs tracking-wider text-muted-foreground font-semibold border-b border-primary/10">
                <tr>
                  <th className="px-6 py-4">Usuário</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Vencimento</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-primary/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground">{u.nome_exibicao}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                      {u.role === 'admin' && <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase font-bold tracking-wider mt-1 inline-block">Admin</span>}
                    </td>
                    <td className="px-6 py-4">
                       <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          u.subscription_status === 'authorized' ? 'bg-green-500/20 text-green-500' :
                          u.subscription_status === 'trial' ? 'bg-amber-500/20 text-amber-500' :
                          'bg-destructive/20 text-destructive'
                       }`}>
                          {u.subscription_status === 'authorized' ? <CheckCircle2 size={12}/> : 
                           u.subscription_status === 'trial' ? <Clock size={12}/> : <Ban size={12}/>}
                          {u.subscription_status}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                       {u.trial_end ? format(new Date(u.trial_end), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {u.role !== 'admin' && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="rounded-lg border-primary/30 hover:bg-primary/10"
                            onClick={() => handleExtendTrial(u.id)}
                            disabled={actionLoading === `extend-${u.id}`}
                          >
                            {actionLoading === `extend-${u.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : '+30 Dias'}
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            className="rounded-lg bg-destructive/80 hover:bg-destructive"
                            onClick={() => handleBanUser(u.id)}
                            disabled={actionLoading === `ban-${u.id}` || u.role === 'banned'}
                          >
                            {actionLoading === `ban-${u.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Banir'}
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

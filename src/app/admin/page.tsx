"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthContext';
import { 
  fetchUsers, 
  fetchPlan, 
  updatePlanPrice, 
  extendTrial, 
  deleteUserPermanent,
  updateTrialEnd 
} from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldAlert, CheckCircle, Clock, Ban, Trash2, Calendar as CalendarIcon, Save } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [users, setUsers] = useState<any[]>([]);
  const [plan, setPlan] = useState<any>(null);
  const [newPrice, setNewPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [token, setToken] = useState('');

  // Admin Login State
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Edit State
  const [editingDate, setEditingDate] = useState<{id: string, date: string} | null>(null);

  useEffect(() => {
    const savedAuth = sessionStorage.getItem('admin_auth');
    if (savedAuth === 'true') {
      setIsAuthorized(true);
      loadData('ilash105046');
    }

    import('@/lib/supabase').then(({ supabase }) => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setToken(session.access_token);
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
      loadData('ilash105046');
    } else {
      toast({ title: 'Erro de Acesso', description: 'Usuário ou senha incorretos.', variant: 'destructive' });
    }
  };

  const loadData = async (accessToken: string) => {
    try {
      setLoading(true);
      const activeToken = accessToken || getActiveToken();
      const [usersData, planData] = await Promise.all([
        fetchUsers(activeToken),
        fetchPlan(activeToken)
      ]);
      setUsers(usersData);
      setPlan(planData);
      setNewPrice(planData?.price?.toString() || '');
    } catch (error) {
      console.error(error);
      if (isAuthorized) {
        toast({ title: 'Erro de Carregamento', description: 'Não foi possível buscar os dados.', variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  const getActiveToken = () => token || 'ilash105046';

  const handleUpdatePrice = async () => {
    if (!newPrice) return;
    setActionLoading('price');
    try {
      await updatePlanPrice(getActiveToken(), parseFloat(newPrice));
      toast({ title: 'Sucesso', description: 'Preço atualizado com sucesso.' });
      loadData(getActiveToken());
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao atualizar preço.', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleExtendTrial = async (userId: string) => {
    setActionLoading(`extend-${userId}`);
    try {
      await extendTrial(getActiveToken(), userId);
      toast({ title: 'Sucesso', description: 'Mais 30 dias concedidos.' });
      loadData(getActiveToken());
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao estender trial.', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeletePermanent = async (userId: string) => {
    if(!confirm("⚠️ AVISO: Isso excluirá o usuário PERMANENTEMENTE do banco de dados e do Auth. Ele poderá se cadastrar novamente do zero. Confirmar?")) return;
    setActionLoading(`delete-${userId}`);
    try {
      await deleteUserPermanent(getActiveToken(), userId);
      toast({ title: 'Sucesso', description: 'Usuário excluído permanentemente.' });
      loadData(getActiveToken());
    } catch (error) {
       toast({ title: 'Erro', description: 'Falha ao excluir usuário.', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateTrialDate = async (userId: string, newDate: string) => {
    setActionLoading(`date-${userId}`);
    try {
      await updateTrialEnd(getActiveToken(), userId, new Date(newDate).toISOString());
      toast({ title: 'Sucesso', description: 'Data de vencimento atualizada.' });
      setEditingDate(null);
      loadData(getActiveToken());
    } catch (error) {
       toast({ title: 'Erro', description: 'Falha ao atualizar data.', variant: 'destructive' });
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
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-primary/10 bg-primary/5">
                    <TableHead className="text-primary/50 text-[10px] uppercase font-black">Usuário</TableHead>
                    <TableHead className="text-primary/50 text-[10px] uppercase font-black">Status</TableHead>
                    <TableHead className="text-primary/50 text-[10px] uppercase font-black">Vencimento</TableHead>
                    <TableHead className="text-right text-primary/50 text-[10px] uppercase font-black">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} className="border-primary/5 hover:bg-primary/5 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-primary/90">{u.nome_exibicao || 'Usuário Sem Nome'}</span>
                          <span className="text-[10px] text-primary/40 font-mono">{u.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {u.subscription_status === 'authorized' ? (
                          <div className="flex items-center gap-2 text-green-500 bg-green-500/10 px-3 py-1 rounded-full w-fit border border-green-500/20">
                            <CheckCircle size={12} />
                            <span className="text-[10px] font-black uppercase">Ativo</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-primary/40 bg-primary/5 px-3 py-1 rounded-full w-fit border border-primary/10">
                            <Clock size={12} />
                            <span className="text-[10px] font-black uppercase">Trial</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-[10px] font-mono whitespace-nowrap">
                        {editingDate?.id === u.id ? (
                          <div className="flex items-center gap-2">
                            <Input 
                              type="date" 
                              className="h-8 w-32 bg-background border-primary/20 p-1 text-[10px]"
                              value={editingDate.date}
                              onChange={(e) => setEditingDate({ ...editingDate, date: e.target.value })}
                            />
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-green-500 hover:text-green-400"
                              onClick={() => handleUpdateTrialDate(u.id, editingDate.date)}
                              disabled={actionLoading === `date-${u.id}`}
                            >
                              <Save size={14} />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {u.trial_end ? format(new Date(u.trial_end), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-primary/30 hover:text-primary"
                              onClick={() => setEditingDate({ id: u.id, date: u.trial_end?.split('T')[0] || '' })}
                            >
                              <CalendarIcon size={12} />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 px-3 rounded-xl border-primary/10 text-[10px] font-black uppercase tracking-tighter hover:bg-primary/10"
                            onClick={() => handleExtendTrial(u.id)}
                            disabled={actionLoading === `extend-${u.id}`}
                          >
                            {actionLoading === `extend-${u.id}` ? <Loader2 className="animate-spin" size={12} /> : '+30 Dias'}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeletePermanent(u.id)}
                            disabled={actionLoading === `delete-${u.id}`}
                          >
                            {actionLoading === `delete-${u.id}` ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={16} />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

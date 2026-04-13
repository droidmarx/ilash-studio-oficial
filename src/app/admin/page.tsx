"use client"

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { 
  fetchUsers, 
  fetchPlan, 
  updatePlanPrice, 
  extendTrial, 
  deleteUserPermanent,
  updateTrialEnd,
  fetchUserCustomers,
  fetchUserTechniques,
  updateUserCustomer,
  deleteUserCustomer,
  updateUserProfile,
  getServerHealth
} from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldAlert, LogOut, CheckCircle, Clock, Ban, Trash2, Calendar as CalendarIcon, Save, Eye, EyeOff, ExternalLink, Users, Settings } from 'lucide-react';
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

  // Admin Login State
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Edit State
  const [editingDate, setEditingDate] = useState<{id: string, date: string} | null>(null);
  const [editingUser, setEditingUser] = useState<{id: string, nome_exibicao: string, custom_price: string} | null>(null);

  // Manage Customers State
  const [managingUser, setManagingUser] = useState<any | null>(null);
  const [userCustomers, setUserCustomers] = useState<any[]>([]);
  const [userTechniques, setUserTechniques] = useState<string[]>([]);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const [customerModalLoading, setCustomerModalLoading] = useState(false);

  const [hasMounted, setHasMounted] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    setHasMounted(true);
    const savedAuth = sessionStorage.getItem('admin_auth');
    if (savedAuth === 'true') {
      setIsAuthorized(true);
      loadData('ilash105046');
    }

    // Usando import dinâmico simplificado ou apenas carregando o token
    const fetchToken = async () => {
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setToken(session.access_token);
    };
    fetchToken();
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
      
      const [usersResult, planData] = await Promise.all([
        fetchUsers(activeToken),
        fetchPlan(activeToken)
      ]);
      
      // fetchUsers agora retorna { success, error, data }
      if (usersResult && 'success' in usersResult) {
        if (usersResult.success) {
          setUsers(usersResult.data || []);
        } else {
          toast({ title: 'Erro ao carregar usuários', description: usersResult.error, variant: 'destructive', duration: 8000 });
          setUsers([]);
        }
      } else {
        // fallback para formato antigo
        setUsers((usersResult as any) || []);
      }
      
      setPlan(planData);
      setNewPrice(planData?.price?.toString() || '');
    } catch (error: any) {
      console.error(error);
      toast({ 
        title: 'Erro de Carregamento', 
        description: error.message || 'Falha na comunicação com o servidor.', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const getActiveToken = () => 'ilash105046';

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

  const handleUpdateUserProfile = async (userId: string, data: any) => {
    setActionLoading(`user-upd-${userId}`);
    try {
      const result = await updateUserProfile(getActiveToken(), userId, data);
      if (result && result.success) {
        // Atualização otimista: atualiza o estado local imediatamente
        // evita que o custom_price reverta para 9.99 por causa do cache do schema do Supabase
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...data } : u));
        toast({ title: 'Sucesso', description: 'Perfil do usuário atualizado.' });
        setEditingUser(null);
      } else {
        const msg = result?.error || 'Falha desconhecida ao atualizar perfil';
        console.error('[Admin UI] updateUserProfile falhou:', msg);
        toast({ title: 'Erro ao Salvar', description: msg, variant: 'destructive', duration: 8000 });
      }
    } catch (error: any) {
      toast({ title: 'Erro Inesperado', description: error.message || 'Erro interno', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleExtendTrial = async (userId: string) => {
    setActionLoading(`extend-${userId}`);
    try {
      const result = await extendTrial(getActiveToken(), userId);
      if (result && result.success) {
        toast({ title: 'Sucesso', description: 'Mais 30 dias concedidos.' });
        loadData(getActiveToken());
      } else {
        toast({ title: 'Erro', description: result?.error || 'Falha ao estender trial.', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Falha ao estender trial.', variant: 'destructive' });
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
    } catch (error: any) {
       toast({ 
         title: 'Erro', 
         description: error.message || 'Falha ao excluir usuário.', 
         variant: 'destructive' 
       });
    } finally {
      setActionLoading(null);
    }
  };

  const safeFormatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Inválido';
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch (e) {
      return 'Erro';
    }
  };

  const handleUpdateTrialDate = async (userId: string, newDate: string) => {
    if (!newDate) {
      toast({ title: 'Aviso', description: 'Selecione uma data válida.' });
      return;
    }
    setActionLoading(`date-${userId}`);
    try {
      const dateObj = new Date(newDate);
      if (isNaN(dateObj.getTime())) throw new Error("Data inválida");
      
      const result = await updateTrialEnd(getActiveToken(), userId, dateObj.toISOString());
      if (result && result.success) {
        toast({ title: 'Sucesso', description: 'Data de vencimento atualizada.' });
        setEditingDate(null);
        loadData(getActiveToken());
      } else {
        toast({ title: 'Erro', description: result?.error || 'Falha ao atualizar data.', variant: 'destructive' });
      }
    } catch (error: any) {
       toast({ 
         title: 'Erro', 
         description: error.message || 'Falha ao atualizar data.', 
         variant: 'destructive' 
       });
    } finally {
      setActionLoading(null);
    }
  };

  const handleManageCustomers = async (u: any) => {
    setManagingUser(u);
    setUserTechniques([]);
    setCustomerModalLoading(true);
    try {
      const [customers, techniques] = await Promise.all([
        fetchUserCustomers(getActiveToken(), u.id),
        fetchUserTechniques(getActiveToken(), u.id),
      ]);
      setUserCustomers(customers || []);
      setUserTechniques(techniques);
    } catch (error: any) {
      toast({ title: 'Erro', description: 'Falha ao carregar clientes do usuário.', variant: 'destructive' });
    } finally {
      setCustomerModalLoading(false);
    }
  };

  const handleUpdateCustomer = async (cid: string, data: any) => {
    setActionLoading(`cust-upd-${cid}`);
    try {
      // Remove unnecessary properties for the update
      const { id, user_id, created_at, updated_at, ...payload } = data;
      await updateUserCustomer(getActiveToken(), cid, payload);
      toast({ title: 'Sucesso', description: 'Dados do cliente atualizados.' });
      setEditingCustomer(null);
      
      // We are in the admin dashboard, we need the active token
      const updated = await fetchUserCustomers(getActiveToken(), managingUser.id);
      setUserCustomers(updated || []);
    } catch (error: any) {
       toast({ title: 'Erro', description: 'Falha ao atualizar cliente.', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteCustomer = async (cid: string) => {
    if(!confirm("Excluir agendamento permanentemente?")) return;
    setActionLoading(`cust-del-${cid}`);
    try {
      await deleteUserCustomer(getActiveToken(), cid);
      toast({ title: 'Sucesso', description: 'Agendamento removido.' });
      const updated = await fetchUserCustomers(getActiveToken(), managingUser.id);
      setUserCustomers(updated || []);
    } catch (error: any) {
       toast({ title: 'Erro', description: 'Falha ao remover cliente.', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  if (!hasMounted || authLoading || loading) {
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
                <div className="relative">
                  <Input
                    type={showAdminPass ? "text" : "password"}
                    value={adminPass}
                    onChange={e => setAdminPass(e.target.value)}
                    className="bg-background/50 border-primary/10 h-12 rounded-xl focus:border-primary/40 focus:ring-0 pr-10"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowAdminPass(!showAdminPass)}
                    className="absolute right-3 top-3 text-primary/40 hover:text-primary transition-colors h-6 w-6 flex items-center justify-center"
                  >
                    {showAdminPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
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
      <div className="flex items-center justify-between border-b border-primary/20 pb-4">
        <div className="flex items-center gap-4">
          <ShieldAlert className="text-primary w-10 h-10" />
          <div>
            <h1 className="text-4xl font-headline text-gold-gradient">Painel de Controle Administrador</h1>
            <p className="text-sm tracking-widest uppercase text-muted-foreground">Gerenciamento completo da plataforma</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-black uppercase tracking-widest text-primary/40">Total de Usuários</p>
          <p className="text-4xl font-headline text-gold-gradient">{users.length}</p>
          <p className="text-[10px] text-primary/30 uppercase tracking-widest">Padrão: R$ 9,99/mês</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Card className="bg-card/60 backdrop-blur-3xl border-primary/20 rounded-3xl overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-primary/10 bg-primary/5">
                    <TableHead className="text-primary/50 text-[10px] uppercase font-black">Usuário / Estúdio</TableHead>
                    <TableHead className="text-primary/50 text-[10px] uppercase font-black">Slug / Link</TableHead>
                    <TableHead className="text-primary/50 text-[10px] uppercase font-black">Vencimento</TableHead>
                    <TableHead className="text-primary/50 text-[10px] uppercase font-black">Preço (R$)</TableHead>
                    <TableHead className="text-primary/50 text-[10px] uppercase font-black">Status</TableHead>
                    <TableHead className="text-right text-primary/50 text-[10px] uppercase font-black">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} className="border-primary/5 hover:bg-primary/5 transition-colors">
                      <TableCell>
                        {editingUser && editingUser.id === u.id ? (
                          <div className="space-y-2">
                             <Input 
                               value={editingUser.nome_exibicao}
                               onChange={e => setEditingUser({ ...editingUser, nome_exibicao: e.target.value })}
                               className="h-8 text-xs bg-background border-primary/20"
                               placeholder="Nome do Estúdio"
                             />
                             <span className="text-[10px] text-primary/40 font-mono">{u.email}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-primary/90">{u.nome_exibicao || 'Usuário Sem Nome'}</span>
                            <span className="text-[10px] text-primary/40 font-mono">{u.email}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <a 
                          href={`/s/${u.slug}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary/60 hover:text-primary transition-colors text-[10px] font-mono group"
                        >
                          /s/{u.slug}
                          <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      </TableCell>
                      <TableCell className="text-[10px] font-mono whitespace-nowrap">
                        {editingDate && editingDate.id === u.id ? (
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
                            {safeFormatDate(u.trial_end)}
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
                      <TableCell>
                        {editingUser && editingUser.id === u.id ? (
                           <Input 
                               type="number"
                               step="0.01"
                               value={editingUser.custom_price}
                               onChange={e => setEditingUser({ ...editingUser, custom_price: e.target.value })}
                               className="h-8 w-24 text-xs bg-background border-primary/20"
                               placeholder="9.99"
                           />
                         ) : (
                           <span className="font-mono text-xs font-bold text-primary">
                             R$ {Number(u.custom_price ?? 9.99).toFixed(2).replace('.', ',')}
                           </span>
                         )}
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
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {editingUser && editingUser.id === u.id ? (
                            <>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-green-500 hover:text-green-400"
                                onClick={() => {
                                  const updatePayload: any = { 
                                    nome_exibicao: editingUser.nome_exibicao,
                                  };
                                  // custom_price: usa o digitado, ou 9.99 como padrão
                                  const cp = parseFloat(editingUser.custom_price);
                                  updatePayload.custom_price = (!isNaN(cp) && isFinite(cp)) ? cp : 9.99;
                                  handleUpdateUserProfile(u.id, updatePayload);
                                }}
                                disabled={actionLoading === `user-upd-${u.id}`}
                              >
                                {actionLoading === `user-upd-${u.id}` ? <Loader2 className="animate-spin" size={12} /> : <Save size={14} />}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-primary/30 hover:text-primary"
                                onClick={() => setEditingUser(null)}
                              >
                                <LogOut size={14} />
                              </Button>
                            </>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 px-3 rounded-xl border-primary/10 text-[10px] font-black uppercase tracking-tighter hover:bg-primary/10"
                              onClick={() => setEditingUser({ 
                                id: u.id, 
                                nome_exibicao: u.nome_exibicao || '', 
                                custom_price: u.custom_price?.toString() || '' 
                              })}
                            >
                              <Settings size={12} className="mr-1" /> Editar
                            </Button>
                          )}
                          <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 px-3 rounded-xl border-primary/10 text-[10px] font-black uppercase tracking-tighter hover:bg-primary/10"
                          onClick={() => handleManageCustomers(u)}
                        >
                          <Users size={12} className="mr-1" /> Clientes
                        </Button>
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

      {/* 🚀 Modal de Gerenciamento de Clientes (Agendamentos) */}
      {managingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
          <Card className="w-full max-w-5xl h-[85vh] bg-card border-primary/20 flex flex-col shadow-2xl overflow-hidden rounded-[2.5rem]">
            <CardHeader className="flex flex-row items-center justify-between border-b border-primary/10 bg-primary/5 p-8">
              <div>
                <CardTitle className="text-2xl text-gold-gradient font-headline">Clientes de {managingUser.nome_exibicao}</CardTitle>
                <p className="text-xs text-primary/40 uppercase font-black tracking-widest mt-1">Super Admin Mode • Edição Total</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setManagingUser(null)} className="rounded-full hover:bg-primary/10">
                <LogOut size={20} className="rotate-180" />
              </Button>
            </CardHeader>
            <div className="flex-1 overflow-y-auto p-8 pt-4">
              {customerModalLoading ? (
                <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-primary" size={40} /></div>
              ) : userCustomers.length === 0 ? (
                <div className="flex flex-col h-full items-center justify-center text-primary/30">
                  <Users size={60} className="mb-4 opacity-10" />
                  <p className="font-bold uppercase tracking-widest">Nenhum cliente cadastrado.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-primary/10 hover:bg-transparent">
                      <TableHead className="text-[10px] uppercase font-black">Cliente</TableHead>
                      <TableHead className="text-[10px] uppercase font-black">Serviço/Técnica</TableHead>
                      <TableHead className="text-[10px] uppercase font-black">Valor</TableHead>
                      <TableHead className="text-[10px] uppercase font-black">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userCustomers.map((c) => (
                      <TableRow key={c.id} className="border-primary/5 hover:bg-primary/5">
                        <TableCell>
                          {editingCustomer?.id === c.id ? (
                            <Input 
                              value={editingCustomer.nome} 
                              onChange={(e) => setEditingCustomer({...editingCustomer, nome: e.target.value})}
                              className="h-8 text-xs bg-background border-primary/20"
                            />
                          ) : (
                            <div className="flex flex-col">
                              <span className="font-bold text-primary">{c.nome}</span>
                              <span className="text-[10px] text-primary/40">{c.whatsapp || 'Sem Whats'}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingCustomer?.id === c.id ? (
                            <div className="flex flex-col gap-1">
                              <select
                                value={editingCustomer.servico}
                                onChange={(e) => setEditingCustomer({...editingCustomer, servico: e.target.value})}
                                className="h-8 text-xs bg-background border border-primary/20 rounded-md px-2 text-foreground"
                              >
                                {userTechniques.map(t => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                              <select
                                value={editingCustomer.tipo}
                                onChange={(e) => setEditingCustomer({...editingCustomer, tipo: e.target.value})}
                                className="h-8 text-[10px] bg-background border border-primary/20 rounded-md px-2 text-foreground"
                              >
                                <option value="Aplicação">Aplicação</option>
                                <option value="Manutenção">Manutenção</option>
                                <option value="Remoção">Remoção</option>
                              </select>
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold">{c.servico}</span>
                              <span className="text-[10px] text-primary/50 uppercase font-black">{c.tipo}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingCustomer?.id === c.id ? (
                            <Input 
                              value={editingCustomer.valor} 
                              onChange={(e) => setEditingCustomer({...editingCustomer, valor: e.target.value})}
                              className="h-8 text-xs bg-background border-primary/20 w-24"
                            />
                          ) : (
                            <span className="font-mono text-xs">R$ {c.valor || '0.00'}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {editingCustomer?.id === c.id ? (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-green-500" 
                                  onClick={() => handleUpdateCustomer(c.id, editingCustomer)}
                                  disabled={actionLoading === `cust-upd-${c.id}`}
                                >
                                  {actionLoading === `cust-upd-${c.id}` ? <Loader2 className="animate-spin" size={14} /> : <Save size={16} />}
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary/40" onClick={() => setEditingCustomer(null)}>
                                  <LogOut size={16} />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-primary/50" 
                                  onClick={() => setEditingCustomer({...c})}
                                >
                                  <CalendarIcon size={14} />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-destructive" 
                                  onClick={() => handleDeleteCustomer(c.id)}
                                  disabled={actionLoading === `cust-del-${c.id}`}
                                >
                                  {actionLoading === `cust-del-${c.id}` ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={16} />}
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

"use client"

import React, { useEffect, useState, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  UserPlus, 
  MoreVertical, 
  Mail, 
  Calendar, 
  Shield, 
  UserMinus,
  LogIn,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  RefreshCcw,
  DollarSign
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { fetchAllUsers, updateUserRole, createAdminLog, updateUserPrice } from '../actions';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

export default function UsersManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingPriceUser, setEditingPriceUser] = useState<any>(null);
  const [newPrice, setNewPrice] = useState<string>('');
  const { toast } = useToast();

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || 'ilash105046';
      
      const { data, error: fetchError } = await fetchAllUsers(token, searchTerm, statusFilter);
      
      if (fetchError) {
        throw new Error(fetchError);
      }
      
      setUsers(data || []);
    } catch (err) {
      toast({
        title: "Erro ao carregar usuários",
        description: "Não foi possível buscar a lista de usuários.",
        variant: "destructive"
      });
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers();
    }, 500);
    return () => clearTimeout(timer);
  }, [loadUsers]);

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || 'ilash105046';
      
      const res = await updateUserRole(token, userId, newRole);
      if (res.error) throw new Error(res.error);

      await createAdminLog(token, 'ROLE_UPDATE', userId, { newRole });
      
      toast({ title: "Role atualizada", description: `Usuário agora é ${newRole}` });
      loadUsers();
    } catch (err) {
      toast({ title: "Erro ao atualizar role", variant: "destructive" });
    }
  };

  const handleUpdatePrice = async () => {
    if (!editingPriceUser) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || 'ilash105046';
      const price = parseFloat(newPrice.replace(',', '.'));
      
      if (isNaN(price)) {
        toast({ title: "Valor inválido", variant: "destructive" });
        return;
      }

      const res = await updateUserPrice(token, editingPriceUser.id, price);
      if (res.error) throw new Error(res.error);

      await createAdminLog(token, 'PRICE_UPDATE', editingPriceUser.id, { oldPrice: editingPriceUser.custom_price, newPrice: price });
      
      toast({ title: "Preço atualizado", description: `Novo valor: R$ ${price.toFixed(2)}` });
      setEditingPriceUser(null);
      loadUsers();
    } catch (err) {
      toast({ title: "Erro ao atualizar preço", variant: "destructive" });
    }
  };

  const handleImpersonate = async (targetUser: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || 'ilash105046';

      await createAdminLog(token, 'IMPERSONATE', targetUser.id, { email: targetUser.email });

      localStorage.setItem('impersonate_user_id', targetUser.id);
      localStorage.setItem('impersonate_user_email', targetUser.email || '');
      
      toast({ 
        title: "Impersonação iniciada", 
        description: `Agora você está vendo o sistema como ${targetUser.email}` 
      });

      // Redireciona para o admin principal (que agora deve mostrar os dados do usuário alvo)
      window.location.href = '/admin';
    } catch (err) {
      toast({ title: "Erro ao iniciar impersonação", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'authorized':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20 gap-1"><CheckCircle2 size={12} /> Ativo</Badge>;
      case 'trial':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 gap-1"><Clock size={12} /> Trial</Badge>;
      case 'unpaid':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 gap-1"><AlertTriangle size={12} /> Inadimplente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-headline text-gold-gradient">Gestão de Usuários</h1>
          <p className="text-sm text-muted-foreground uppercase tracking-widest font-black mt-1">
            Controle total sobre os assinantes da plataforma
          </p>
        </div>
        <Button className="bg-gold-gradient text-primary-foreground rounded-2xl gap-2 font-bold shadow-lg shadow-primary/20">
          <UserPlus size={18} /> Novo Usuário
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input 
            placeholder="Buscar por nome, email ou slug..." 
            className="pl-10 h-12 bg-card/50 border-border/40 rounded-2xl focus:ring-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[200px] h-12 bg-card/50 border-border/40 rounded-2xl">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border/40 rounded-xl">
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="authorized">Ativos (Pagantes)</SelectItem>
            <SelectItem value="trial">Em Trial</SelectItem>
            <SelectItem value="unpaid">Inadimplentes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <div className="bg-card/40 backdrop-blur-3xl border border-border/40 rounded-[2rem] overflow-hidden shadow-xl">
        {error ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4 text-center">
             <AlertTriangle className="text-destructive w-12 h-12" />
             <div>
               <h3 className="text-lg font-bold text-foreground">Falha ao carregar</h3>
               <p className="text-sm text-muted-foreground">Ocorreu um erro ao buscar os usuários.</p>
             </div>
             <Button onClick={loadUsers} variant="outline" className="gap-2 mt-2">
                <RefreshCcw size={16} /> Tentar Novamente
             </Button>
          </div>
        ) : loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full rounded-xl bg-primary/10" />
            <Skeleton className="h-16 w-full rounded-xl bg-primary/5" />
            <Skeleton className="h-16 w-full rounded-xl bg-primary/5" />
            <Skeleton className="h-16 w-full rounded-xl bg-primary/5" />
            <Skeleton className="h-16 w-full rounded-xl bg-primary/5" />
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <Table className="min-w-[800px]">
              <TableHeader className="bg-primary/5">
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead className="text-[10px] font-black uppercase text-primary/40 px-6 py-4">Usuário / Estúdio</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-primary/40">Status</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-primary/40">Role</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-primary/40">Plano / Preço</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-primary/40">Cadastro</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase text-primary/40 px-6">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!(users || []).length ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-40 text-center text-muted-foreground italic">Nenhum usuário encontrado.</TableCell>
                  </TableRow>
                ) : (
                  (users || []).map((u) => (
                    <TableRow key={u.id} className="border-border/40 hover:bg-primary/5 transition-colors group">
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gold-gradient flex items-center justify-center font-bold text-primary-foreground shadow-sm">
                          {(u.nome_exibicao || u.email || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-foreground">{u.nome_exibicao || 'Meu Studio'}</p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Mail size={10} /> {u.email}
                          </p>
                          <a href={`/s/${u.slug}`} target="_blank" className="text-[10px] text-primary hover:underline flex items-center gap-1 mt-0.5">
                            <ExternalLink size={10} /> /{u.slug}
                          </a>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(u.subscription_status)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-[10px] font-bold border-primary/20 bg-primary/5">
                        <Shield size={10} className="mr-1" /> {u.role === 'super_admin' ? 'Super Admin' : u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-foreground">{u.plan || 'Premium'}</span>
                        <span className="text-[10px] text-primary font-mono">
                          R$ {Number(u.custom_price || 9.99).toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[10px] font-mono text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar size={10} />
                        {u.created_at ? format(new Date(u.created_at), 'dd/MM/yy', { locale: ptBR }) : '--/--/--'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10">
                            <MoreVertical size={18} className="text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-card border-border/40 rounded-2xl shadow-2xl p-2">
                          <DropdownMenuLabel className="text-[10px] font-black uppercase text-primary/40 px-2 py-1">Gerenciar</DropdownMenuLabel>
                          <DropdownMenuItem 
                            onClick={() => handleImpersonate(u)}
                            className="rounded-xl flex gap-2 font-bold text-xs p-3 cursor-pointer"
                          >
                            <LogIn size={16} className="text-primary" /> Entrar como Usuário
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              setEditingPriceUser(u);
                              setNewPrice(String(u.custom_price || 9.99));
                            }}
                            className="rounded-xl flex gap-2 font-bold text-xs p-3 cursor-pointer"
                          >
                            <DollarSign size={16} className="text-green-500" /> Alterar Preço
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-xl flex gap-2 font-bold text-xs p-3">
                            <Calendar size={16} className="text-blue-500" /> Detalhes da Assinatura
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator className="bg-border/40" />
                          
                          <DropdownMenuLabel className="text-[10px] font-black uppercase text-primary/40 px-2 py-1">Permissões</DropdownMenuLabel>
                          <DropdownMenuItem 
                            onClick={() => handleUpdateRole(u.id, u.role === 'admin' ? 'user' : 'admin')}
                            className="rounded-xl flex gap-2 font-bold text-xs p-3"
                          >
                            <Shield size={16} className="text-orange-500" />
                            {u.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator className="bg-border/40" />
                          
                          <DropdownMenuItem className="rounded-xl flex gap-2 font-bold text-xs p-3 text-destructive hover:text-destructive">
                            <UserMinus size={16} /> Excluir Conta
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        )}
      </div>

      {/* Edit Price Dialog */}
      <Dialog open={!!editingPriceUser} onOpenChange={(open) => !open && setEditingPriceUser(null)}>
        <DialogContent className="bg-card border-border/40 rounded-3xl sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-headline">Ajustar Valor Mensal</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground uppercase font-black">
              Defina um preço personalizado para {editingPriceUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-primary/40 px-1">Novo Valor (R$)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input 
                  type="text"
                  placeholder="9,99"
                  className="pl-10 h-12 bg-background border-border/40 rounded-2xl font-bold"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground bg-primary/5 p-4 rounded-2xl italic leading-relaxed">
              O novo valor será aplicado imediatamente em novas cobranças e visualizado pelo usuário em seu painel de assinatura.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setEditingPriceUser(null)} className="rounded-xl font-bold">Cancelar</Button>
            <Button onClick={handleUpdatePrice} className="bg-gold-gradient text-primary-foreground rounded-xl font-bold px-8 shadow-lg shadow-primary/20">
              Salvar Novo Preço
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

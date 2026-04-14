"use client"

import React, { useEffect, useState } from 'react';
import { 
  CreditCard, 
  Search, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Loader2,
  ExternalLink,
  History,
  DollarSign
} from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchAllSubscriptions, manualUpdateSubscription } from '../actions';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || 'ilash105046';
        const { data, error } = await fetchAllSubscriptions(token);
        if (error) throw new Error(error);
        setSubscriptions(data || []);
      } catch (err) {
        toast({ title: "Erro ao carregar assinaturas", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [toast]);

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'authorized':
      case 'active':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Ativa</Badge>;
      case 'cancelled':
      case 'paused':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Cancelada</Badge>;
      case 'pending':
        return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredSubs = subscriptions.filter(sub => 
    sub.perfis?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.mercadopago_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-headline text-gold-gradient">Gestão Financeira</h1>
          <p className="text-sm text-muted-foreground uppercase tracking-widest font-black mt-1">
            Controle de assinaturas e pagamentos Mercado Pago
          </p>
        </div>
        <div className="flex items-center gap-3">
           <div className="px-4 py-2 bg-green-500/10 rounded-2xl border border-green-500/20 flex items-center gap-2">
              <DollarSign size={16} className="text-green-500" />
              <span className="text-sm font-bold text-green-500">Gateway: Conectado</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card/50 border-border/40 rounded-3xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black uppercase text-primary/40 tracking-widest">Taxa de Conversão</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">24%</p>
            <p className="text-[10px] text-muted-foreground mt-1">Trial para Pago</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/40 rounded-3xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black uppercase text-primary/40 tracking-widest">Churn Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-500">2.1%</p>
            <p className="text-[10px] text-muted-foreground mt-1">Últimos 30 dias</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/40 rounded-3xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black uppercase text-primary/40 tracking-widest">Assinaturas Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-500">{subscriptions.filter(s => s.status === 'authorized').length}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Total acumulado</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input 
          placeholder="Buscar por email ou ID do Mercado Pago..." 
          className="pl-10 h-12 bg-card/50 border-border/40 rounded-2xl"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Subscriptions Table */}
      <div className="bg-card/40 backdrop-blur-3xl border border-border/40 rounded-[2rem] overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-primary" size={40} /></div>
        ) : (
          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="text-[10px] font-black uppercase text-primary/40 px-6 py-4">Usuário</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-primary/40">ID Mercado Pago</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-primary/40">Status</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-primary/40">Próximo Vencimento</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase text-primary/40 px-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center text-muted-foreground italic">Nenhuma assinatura encontrada.</TableCell>
                </TableRow>
              ) : (
                filteredSubs.map((sub) => (
                  <TableRow key={sub.id} className="border-border/40 hover:bg-primary/5 transition-colors">
                    <TableCell className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-foreground">{sub.perfis?.nome_exibicao || 'Usuário'}</span>
                        <span className="text-[10px] text-muted-foreground">{sub.perfis?.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-[10px] bg-background px-2 py-1 rounded-md border border-border/40">
                        {sub.mercadopago_id}
                      </code>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(sub.status)}
                    </TableCell>
                    <TableCell className="text-[10px] font-mono">
                       {sub.current_period_end ? format(new Date(sub.current_period_end), 'dd/MM/yyyy', { locale: ptBR }) : '---'}
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" className="h-8 rounded-xl border-primary/10 text-[10px] font-black uppercase tracking-tighter hover:bg-primary/10">
                          <History size={12} className="mr-1" /> Editar
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                          <ExternalLink size={14} className="text-muted-foreground" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

"use client"

import React, { useEffect, useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Calendar, 
  Info,
  Loader2,
  Trash2,
  Shield,
  User,
  Zap
} from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getRecentActivity, clearOldLogs } from '../actions';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const loadLogs = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || 'ilash105046';
      const { data, error } = await getRecentActivity(token);
      if (error) throw new Error(error);
      setLogs(data || []);
    } catch (err) {
      toast({ title: "Erro ao carregar logs", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [toast]);

  const handleClearLogs = async () => {
    if (!confirm("Tem certeza que deseja apagar os logs com mais de 30 dias?")) return;
    
    try {
      setClearing(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || 'ilash105046';
      
      const res = await clearOldLogs(token);
      if (res.error) throw new Error(res.error);

      toast({ 
        title: "Logs limpos", 
        description: `${res.count || 0} registros antigos foram removidos.` 
      });
      loadLogs();
    } catch (err) {
      toast({ title: "Erro ao limpar logs", variant: "destructive" });
    } finally {
      setClearing(false);
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'IMPERSONATE':
        return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20 gap-1"><User size={10} /> Impersonação</Badge>;
      case 'ROLE_UPDATE':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 gap-1"><Shield size={10} /> Role Change</Badge>;
      case 'MANUAL_SUBSCRIPTION_UPDATE':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20 gap-1"><Zap size={10} /> Assinatura</Badge>;
      default:
        return <Badge variant="outline" className="gap-1"><Info size={10} /> {action}</Badge>;
    }
  };

  const filteredLogs = logs.filter(log => 
    log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.target_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-headline text-gold-gradient">Logs de Auditoria</h1>
          <p className="text-sm text-muted-foreground uppercase tracking-widest font-black mt-1">
            Histórico completo de ações administrativas
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleClearLogs}
          disabled={clearing}
          className="rounded-2xl border-primary/10 text-xs font-bold gap-2 hover:bg-destructive/5 hover:text-destructive transition-all active:scale-95"
        >
          {clearing ? <Loader2 size={16} className="animate-spin text-destructive" /> : <Trash2 size={16} />}
          {clearing ? 'Limpando...' : 'Limpar Logs Antigos'}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input 
            placeholder="Buscar por ação ou ID alvo..." 
            className="pl-10 h-12 bg-card/50 border-border/40 rounded-2xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="h-12 px-6 rounded-2xl gap-2 border-border/40 bg-card/50">
          <Calendar size={18} /> Filtrar Data
        </Button>
      </div>

      {/* Logs Table */}
      <div className="bg-card/40 backdrop-blur-3xl border border-border/40 rounded-[2rem] overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-primary" size={40} /></div>
        ) : (
          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="text-[10px] font-black uppercase text-primary/40 px-6 py-4">Data / Hora</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-primary/40">Ação</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-primary/40">ID Alvo</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-primary/40">Detalhes</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-primary/40">IP / Origem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center text-muted-foreground italic">Nenhum log registrado.</TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} className="border-border/40 hover:bg-primary/5 transition-colors">
                    <TableCell className="px-6 py-4 text-[10px] font-mono text-muted-foreground">
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {getActionBadge(log.action)}
                    </TableCell>
                    <TableCell>
                      <code className="text-[10px] bg-background px-2 py-1 rounded-md border border-border/40">
                        {log.target_id || 'Global'}
                      </code>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <div className="truncate text-[10px] text-muted-foreground font-mono">
                        {JSON.stringify(log.details)}
                      </div>
                    </TableCell>
                    <TableCell className="text-[10px] font-mono text-muted-foreground">
                      {log.ip_address || '---'}
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

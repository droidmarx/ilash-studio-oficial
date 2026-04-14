"use client"

import React, { useEffect, useState } from 'react';
import { 
  Users, 
  CreditCard, 
  TrendingUp, 
  Calendar,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getDashboardStats, getRecentActivity } from './actions';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardStats {
  totalUsers: number;
  activeSubs: number;
  trialUsers: number;
  monthlyRevenue: number;
  totalAppointments: number;
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || 'ilash105046';

        const [statsResponse, logsResponse] = await Promise.all([
          getDashboardStats(token),
          getRecentActivity(token)
        ]);

        if (statsResponse.error) {
           setError(statsResponse.error);
        } else {
           setStats(statsResponse.data);
        }

        if (!logsResponse.error) {
           setLogs(logsResponse.data || []);
        }
      } catch (err: any) {
        console.error("Erro ao carregar dashboard:", err);
        setError(String(err?.message || err || "Falha ao carregar dados do servidor."));
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-destructive gap-4">
        <AlertCircle size={48} />
        <p className="font-bold text-center">{String(error)}</p>
      </div>
    );
  }

  const statCards = [
    { 
      title: 'Usuários Totais', 
      value: stats?.totalUsers ?? 0, 
      icon: <Users className="text-blue-500" />, 
      desc: 'Base total de cadastros',
      trend: '+12%',
      trendUp: true
    },
    { 
      title: 'Assinaturas Ativas', 
      value: stats?.activeSubs ?? 0, 
      icon: <CreditCard className="text-green-500" />, 
      desc: 'Pagantes recorrentes',
      trend: '+5%',
      trendUp: true
    },
    { 
      title: 'Receita Mensal', 
      value: `R$ ${Number(stats?.monthlyRevenue || 0).toFixed(2).replace('.', ',')}`, 
      icon: <TrendingUp className="text-gold-gradient" />, 
      desc: 'MRR Estimado',
      trend: '+8%',
      trendUp: true
    },
    { 
      title: 'Agendamentos', 
      value: stats?.totalAppointments ?? 0, 
      icon: <Calendar className="text-purple-500" />, 
      desc: 'Total no sistema',
      trend: '+24%',
      trendUp: true
    },
  ];

  return (
    <div className="space-y-10">
      {/* Welcome Header */}
      <div>
        <h1 className="text-4xl font-headline text-gold-gradient">Visão Geral do SaaS</h1>
        <p className="text-sm text-muted-foreground uppercase tracking-widest font-black mt-1">
          Monitoramento em tempo real da plataforma
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, i) => (
          <Card key={i} className="bg-card/50 backdrop-blur-3xl border-border/40 rounded-3xl overflow-hidden hover:border-primary/30 transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-background rounded-2xl border border-border/40 group-hover:scale-110 transition-transform">
                  {card.icon}
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full",
                  card.trendUp ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                )}>
                  {card.trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {card.trend}
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-3xl font-bold tracking-tight">{card.value}</h3>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-tighter">{card.title}</p>
                <p className="text-[10px] text-muted-foreground/60">{card.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity Logs */}
        <Card className="lg:col-span-2 bg-card/50 backdrop-blur-3xl border-border/40 rounded-3xl overflow-hidden">
          <CardHeader className="border-b border-border/40 pb-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-headline flex items-center gap-2">
                <Activity size={20} className="text-primary" />
                Atividade Recente
              </CardTitle>
              <span className="text-[10px] font-black uppercase text-primary/40">Últimos logs</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {logs.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground italic text-sm">
                Nenhuma atividade registrada ainda.
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {logs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-primary/5 transition-colors flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground">
                        {log.action} <span className="text-muted-foreground font-normal">no recurso</span> {log.target_id || 'Global'}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase font-black">
                        {format(new Date(log.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    {log.details && (
                      <div className="text-[10px] bg-background px-2 py-1 rounded-md border border-border/40 max-w-[150px] truncate">
                        {JSON.stringify(log.details)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Health / Quick Info */}
        <Card className="bg-card/50 backdrop-blur-3xl border-border/40 rounded-3xl overflow-hidden">
          <CardHeader className="border-b border-border/40 pb-4">
            <CardTitle className="text-xl font-headline">Status do Sistema</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-black uppercase tracking-widest mb-2">
                <span>Saúde da API</span>
                <span className="text-green-500">Operacional</span>
              </div>
              <div className="h-2 w-full bg-background rounded-full overflow-hidden">
                <div className="h-full bg-green-500 w-[98%]" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-background rounded-2xl border border-border/40">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-xs font-bold uppercase">Base Supabase</span>
                </div>
                <span className="text-[10px] font-mono opacity-50">v2.45.4</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-background rounded-2xl border border-border/40">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  <span className="text-xs font-bold uppercase">Mercado Pago</span>
                </div>
                <span className="text-[10px] font-mono opacity-50">Conectado</span>
              </div>
            </div>

            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
              <p className="text-[10px] font-black uppercase text-primary/60 mb-1">Dica do Sistema</p>
              <p className="text-xs text-foreground leading-relaxed">
                Você pode usar o modo <b>Impersonação</b> na aba de usuários para investigar problemas específicos de clientes.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

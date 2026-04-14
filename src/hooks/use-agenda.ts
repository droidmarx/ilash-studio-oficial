import { useState, useEffect, useCallback, useRef } from 'react';
import { getClients, createClient, updateClient, deleteClient, Client } from '@/lib/api';
import { logAction } from '@/app/actions/audit';
import { addMonths, subMonths, isSameDay, parse, isValid, getMonth, getDate, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { sendTelegramNotification } from '@/app/actions/notifications';
import { useAuth } from '@/hooks/use-auth';
import { parseBirthday } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export type RealtimeStatus = 'connecting' | 'connected' | 'disconnected';

export function useAgenda() {
  const { user, impersonatedUser } = useAuth();
  const effectiveUserId = impersonatedUser?.id || user?.id;
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting');
  const { toast } = useToast();

  // Deduplication: track recently processed realtime event IDs
  const processedIds = useRef<Set<string>>(new Set());

  const fetchClients = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getClients(effectiveUserId);
      setClients(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os dados da agenda.",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, effectiveUserId]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // ─── Supabase Realtime ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!effectiveUserId) return;

    setRealtimeStatus('connecting');

    const channel = supabase
      .channel(`agenda-realtime-${effectiveUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agendamentos',
          filter: `user_id=eq.${effectiveUserId}`,
        },
        (payload) => {
          // ── Deduplication ──────────────────────────────────────────────────
          const eventId = `${payload.eventType}-${(payload.new as any)?.id || (payload.old as any)?.id}-${Date.now()}`;
          const stableId = `${payload.eventType}-${(payload.new as any)?.id || (payload.old as any)?.id}`;

          if (processedIds.current.has(stableId)) return;
          processedIds.current.add(stableId);
          // Clear after 2s to allow future updates to the same record
          setTimeout(() => processedIds.current.delete(stableId), 2000);

          if (process.env.NODE_ENV === 'development') {
            console.log('[Realtime] Evento recebido:', payload);
          }

          // ── Silent refetch ─────────────────────────────────────────────────
          fetchClients(true);

          // ── Toast por tipo de evento ───────────────────────────────────────
          const clientName = (payload.new as any)?.nome || (payload.old as any)?.nome || 'Cliente';

          if (payload.eventType === 'INSERT') {
            toast({
              title: "📅 Novo agendamento",
              description: `${clientName} foi adicionado à agenda.`,
            });
          } else if (payload.eventType === 'UPDATE') {
            toast({
              title: "✏️ Agendamento atualizado",
              description: `${clientName} foi modificado.`,
            });
          } else if (payload.eventType === 'DELETE') {
            toast({
              variant: "destructive",
              title: "❌ Agendamento cancelado",
              description: `${(payload.old as any)?.nome || 'Agendamento'} foi removido.`,
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected');
          if (process.env.NODE_ENV === 'development') {
            console.log('[Realtime] Conectado ao canal de agendamentos.');
          }
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setRealtimeStatus('disconnected');
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setRealtimeStatus('disconnected');
    };
  }, [effectiveUserId, fetchClients, toast]);
  // ────────────────────────────────────────────────────────────────────────────

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const safeParseDate = (dataStr: string) => {
    if (!dataStr) return new Date();
    try {
      if (dataStr.includes('T')) return parseISO(dataStr);
      if (dataStr.includes('/')) return parse(dataStr, 'dd/MM/yyyy', new Date());
      const d = new Date(dataStr);
      return isValid(d) ? d : new Date();
    } catch (e) {
      return new Date();
    }
  };

  const getDayEvents = (day: Date) => {
    return clients.filter(client => isSameDay(day, safeParseDate(client.data)));
  };

  const getDayBirthdays = (day: Date) => {
    const seen = new Set();
    return clients.filter(client => {
      if (!client.aniversario) return false;
      try {
        const bday = parseBirthday(client.aniversario);
        if (!bday) return false;
        
        const isBday = getMonth(day) === getMonth(bday) && getDate(day) === getDate(bday);
        if (isBday && !seen.has(client.nome)) {
          seen.add(client.nome);
          return true;
        }
        return false;
      } catch (e) {
        return false;
      }
    });
  };

  const upcomingAppointments = [...clients]
    .filter(client => {
      const appDate = safeParseDate(client.data);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return appDate >= today;
    })
    .sort((a, b) => safeParseDate(a.data).getTime() - safeParseDate(b.data).getTime());

  const addAppointment = async (data: Omit<Client, 'id'>) => {
    setLoading(true);
    try {
      const newClient = await createClient(data, effectiveUserId);
      toast({ title: "Sucesso", description: "Agendamento criado!" });
      await sendTelegramNotification({ tipo: 'Novo', cliente: newClient, userId: effectiveUserId });
      await fetchClients(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao criar agendamento." });
      setLoading(false);
    }
  };

  const editAppointment = async (id: string, data: Partial<Client>) => {
    setLoading(true);
    try {
      const oldData = clients.find(c => c.id === id);
      const updated = await updateClient(id, data);
      
      if (user) {
        await logAction({
          user_id: user.id,
          acao: data.confirmado === true && oldData?.confirmado !== true ? 'Confirmação' : 'Atualização',
          cliente_id: id,
          antes: oldData,
          depois: updated,
          detalhes: { campos: Object.keys(data).join(', ') }
        });
      }

      toast({ title: "Sucesso", description: "Atualizado!" });
      if (oldData) {
        const type = (data.confirmado === true && oldData.confirmado !== true) ? 'Confirmado' : 'Alterado';
        await sendTelegramNotification({
          tipo: type,
          cliente: updated,
          antes: oldData,
          depois: updated,
          userId: user?.id
        });
      }
      await fetchClients(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao atualizar." });
      setLoading(false);
    }
  };

  const removeAppointment = async (id: string) => {
    setLoading(true);
    try {
      const clientToRemove = clients.find(c => c.id === id);
      await deleteClient(id);

      if (user && clientToRemove) {
        await logAction({
          user_id: user.id,
          acao: 'Remoção',
          cliente_id: id,
          antes: clientToRemove,
          detalhes: 'Agendamento removido'
        });
      }

      toast({ title: "Excluído", description: "Agendamento removido com sucesso." });
      // ✅ Corrigido: usar silent refetch em vez de window.location.reload()
      await fetchClients(true);
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao excluir." });
      setLoading(false);
    }
  };

  return {
    clients,
    loading,
    currentMonth,
    nextMonth,
    prevMonth,
    getDayEvents,
    getDayBirthdays,
    upcomingAppointments,
    addAppointment,
    editAppointment,
    removeAppointment,
    refresh: fetchClients,
    realtimeStatus,
  };
}

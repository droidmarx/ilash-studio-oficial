import { useState, useEffect, useCallback } from 'react';
import { getClients, createClient, updateClient, deleteClient, Client } from '@/lib/api';
import { addMonths, subMonths, isSameDay, parse, isValid, getMonth, getDate, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { notifyAppointmentChange } from '@/app/actions/notifications';
import { parseBirthday } from '@/lib/utils';

export function useAgenda() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { toast } = useToast();

  const fetchClients = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getClients();
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
  }, [toast]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

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
      const newClient = await createClient(data);
      toast({ title: "Sucesso", description: "Agendamento criado!" });
      await notifyAppointmentChange(newClient, 'Novo');
      await fetchClients(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao criar agendamento." });
      setLoading(false);
    }
  };

  const editAppointment = async (id: string, data: Partial<Client>) => {
    setLoading(true);
    try {
      await updateClient(id, data);
      toast({ title: "Sucesso", description: "Atualizado!" });
      const updatedData = clients.find(c => c.id === id);
      if (updatedData) {
        await notifyAppointmentChange({ ...updatedData, ...data }, 'Alterado');
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
      await deleteClient(id);
      toast({ title: "Excluído", description: "Agendamento removido com sucesso." });
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
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
    refresh: fetchClients
  };
}

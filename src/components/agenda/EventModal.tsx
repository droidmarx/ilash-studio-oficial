
"use client"

import { useState } from "react"
import { format, parseISO, addDays, getMonth, isValid } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Client, Anamnese, getCustomMessages } from "@/lib/api"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Calendar, User, Clock, MessageSquare, Info, Trash2, Edit2, Send, Cake, RotateCw, PartyPopper, PlusCircle, Sparkles, ClipboardList, DollarSign, CheckCircle, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AppointmentForm } from "./AppointmentForm"
import { AnamneseModal } from "./AnamneseModal"
import { ReminderDialog } from "./ReminderDialog"
import { cn, parseBirthday, generateWhatsAppMessage } from "@/lib/utils"

interface EventModalProps {
  day: Date | null
  events: Client[]
  birthdays: Client[]
  isOpen: boolean
  loading?: boolean
  onClose: () => void
  onAddNew?: (date: Date) => void
  onEdit: (id: string, data: any) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function EventModal({ day, events, birthdays, isOpen, loading, onClose, onAddNew, onEdit, onDelete }: EventModalProps) {
  const [editingEvent, setEditingEvent] = useState<Client | null>(null)
  const [anamneseClient, setAnamneseClient] = useState<Client | null>(null)
  const [reminderClient, setReminderClient] = useState<Client | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  if (!day) return null

  const handleEditSubmit = async (data: any) => {
    if (editingEvent) {
      await onEdit(editingEvent.id, data)
      setEditingEvent(null)
    }
  }

  const handleConfirmBooking = async (event: Client) => {
    await onEdit(event.id, { confirmado: true });
    
    if (event.whatsapp) {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const customMsgs = await getCustomMessages();
      const message = generateWhatsAppMessage(event, customMsgs.whatsappReminder, event.tipo, origin);
      const cleanPhone = event.whatsapp.replace(/\D/g, "");
      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank");
    }
  }

  const handleSaveAnamnese = async (id: string, anamnese: Anamnese) => {
    await onEdit(id, { 
      anamnese,
      aniversario: anamnese.dataNascimento
    });
  }

  const handleQuickReschedule = (event: Client, daysToAdd: number) => {
    const currentAppDate = event.data.includes('T') ? parseISO(event.data) : new Date(event.data);
    const newDate = addDays(currentAppDate, daysToAdd);
    
    setEditingEvent({
      ...event,
      data: newDate.toISOString().slice(0, 16),
      confirmado: false // Reset status to unconfirmed on quick reschedule
    });
  }

  const isBirthdayMonth = (client: Client) => {
    if (!client.aniversario || !day) return false;
    const bday = parseBirthday(client.aniversario);
    if (!bday) return false;
    return getMonth(day) === getMonth(bday);
  }

  const handleSendBirthdayGreeting = (client: Client) => {
    if (!client.whatsapp) return;
    const message = `🎈*Feliz Aniversário, ${client.nome.trim()}!* 🎈\n\n✨ Que seu dia seja tão radiante quanto seu olhar! Desejamos muitas felicidades, saúde e sucesso.\n\nPara celebrar seu mês especial, temos mimos exclusivos esperando por você no Studio Lash! 💖\n\nAproveite muito seu dia! 💕`;
    const cleanPhone = client.whatsapp.replace(/\D/g, "");
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }

  const handleDelete = async () => {
    if (deleteConfirmId) {
      try {
        await onDelete(deleteConfirmId);
        setDeleteConfirmId(null);
      } catch (error) {
        console.error("Erro ao excluir", error);
      }
    }
  }

  const getEventDate = (dataStr: string) => {
    try {
      if (dataStr.includes('T')) return parseISO(dataStr);
      return new Date(dataStr);
    } catch (e) {
      return new Date();
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
          onClose()
          setEditingEvent(null)
        }
      }}>
        <DialogContent className="w-[95vw] sm:max-w-[600px] rounded-[2rem] md:rounded-3xl overflow-hidden p-0 max-h-[95vh] overflow-y-auto bg-background text-foreground border-border">
          <DialogHeader className="p-6 md:p-8 pb-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <DialogTitle className="text-xl md:text-2xl font-headline text-gold-gradient flex items-center gap-2">
                  <Calendar className="text-primary" size={20} />
                  {editingEvent 
                    ? `Configurar Remarcação` 
                    : `Agenda de ${format(day, "dd/MM", { locale: ptBR })}`}
                </DialogTitle>
                <DialogDescription className="text-xs md:text-sm text-muted-foreground">
                  {editingEvent 
                    ? "Confirme o procedimento e adicionais para a nova data. O status será alterado para Pendente." 
                    : "Compromissos e aniversariantes."}
                </DialogDescription>
              </div>
              {!editingEvent && onAddNew && (
                <Button 
                  onClick={() => { onAddNew(day); }}
                  className="rounded-full gap-2 shadow-lg bg-gold-gradient text-primary-foreground font-bold h-10 w-fit"
                  size="sm"
                  disabled={loading}
                >
                  <PlusCircle size={18} />
                  Agendar
                </Button>
              )}
            </div>
          </DialogHeader>
          
          <div className="p-6 md:p-8 pt-4 space-y-6">
            {editingEvent ? (
              <AppointmentForm 
                initialData={editingEvent} 
                onSubmit={handleEditSubmit} 
                onCancel={() => setEditingEvent(null)} 
                loading={loading}
              />
            ) : (
              <div className="space-y-6">
                {birthdays.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-primary font-bold text-sm flex items-center gap-2 px-1">
                      <PartyPopper size={18} />
                      Aniversariantes 🎈
                    </h3>
                    {birthdays.map((bday) => (
                      <div key={`bday-${bday.id}`} className="bg-card/50 backdrop-blur-md border border-border p-4 rounded-2xl flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <Cake size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-foreground text-sm">{bday.nome}</p>
                            <p className="text-[10px] text-primary/60">Aniversário hoje! ✨</p>
                          </div>
                        </div>
                        {bday.whatsapp && (
                          <Button 
                            size="icon" 
                            variant="outline" 
                            className="rounded-full border-primary/20 text-primary h-8 w-8"
                            onClick={() => handleSendBirthdayGreeting(bday)}
                            disabled={loading}
                          >
                            <Send size={14} />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="text-primary/40 font-bold text-xs uppercase tracking-widest px-1">
                    Agendamentos
                  </h3>
                  {events.length > 0 ? (
                    events.map((event) => {
                      const bdayMonth = isBirthdayMonth(event);
                      const isAnamneseFilled = !!event.anamnese?.assinatura;
                      const isPending = event.confirmado === false;
                      const eventDate = getEventDate(event.data);
                      
                      return (
                        <div 
                          key={event.id} 
                          className={cn(
                            "group p-4 rounded-2xl border bg-card/40 backdrop-blur-md hover:bg-foreground/5 transition-all shadow-sm relative",
                            bdayMonth && "border-primary/40 bg-primary/5",
                            isPending && "border-primary border-dashed bg-primary/5"
                          )}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="space-y-1">
                              <h4 className="font-bold text-base md:text-lg flex items-center gap-2 text-foreground">
                                <User size={16} className="text-primary/60" />
                                {event.nome}
                              </h4>
                              <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase">
                                <Calendar size={12} className="shrink-0" />
                                <span className="capitalize">{format(eventDate, 'EEEE', { locale: ptBR })}</span>
                                <span className="opacity-40">•</span>
                                <span className="flex items-center gap-1">
                                  <Clock size={12} className="shrink-0" />
                                  {format(eventDate, 'HH:mm')}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                {isPending ? (
                                  <Badge variant="outline" className="text-[10px] font-black uppercase text-primary border-primary animate-pulse flex items-center gap-1 h-6">
                                    <AlertCircle size={10} /> Pendente
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] font-black uppercase text-green-500 border-green-500 flex items-center gap-1 h-6">
                                    <CheckCircle size={10} /> Confirmado
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-[10px] uppercase border transition-colors",
                                event.tipo === 'Aplicação' ? "border-primary text-primary bg-primary/10" :
                                event.tipo === 'Manutenção' ? "border-primary/50 text-primary/70 bg-primary/5" :
                                "border-border text-muted-foreground"
                              )}
                            >
                              {event.tipo}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground mt-3">
                            <div className="flex items-center gap-2">
                              <Sparkles size={14} className="text-primary/40" />
                              <span>{event.servico} - R$ {event.valor || '0,00'}</span>
                            </div>
                            {event.whatsapp && (
                              <div className="flex items-center gap-2">
                                <MessageSquare size={14} className="text-primary/40" />
                                <span className="truncate">{event.whatsapp}</span>
                              </div>
                            )}
                          </div>
                          
                          {event.servicosAdicionais && event.servicosAdicionais.length > 0 && (
                            <div className="mt-3 text-[11px] flex flex-col gap-2">
                              <span className="text-primary/60 font-bold flex items-center gap-1"><Sparkles size={12} /> Adicionais:</span>
                              <div className="flex flex-wrap gap-2">
                                {event.isUnifiedValue ? (
                                  <Badge key="unified-badge" variant="secondary" className="text-[9px] h-5 py-0 px-2 rounded-lg bg-primary/10 border-primary/30 text-primary flex items-center gap-1">
                                    <DollarSign size={8} /> {event.servicosAdicionais.map(a => a.nome).join(" + ")} (Unificado: R$ {event.unifiedValue})
                                  </Badge>
                                ) : (
                                  event.servicosAdicionais.map((a, i) => (
                                    <Badge key={i} variant="secondary" className="text-[9px] h-5 py-0 px-2 rounded-lg bg-primary/5 border-primary/20 text-primary">
                                      {a.nome} (+R$ {a.valor})
                                    </Badge>
                                  ))
                                )}
                              </div>
                            </div>
                          )}

                          <div className="mt-4 border-t border-border pt-4 space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col gap-2">
                                <span className="text-[10px] font-bold text-primary/40 uppercase flex items-center gap-1">
                                  <RotateCw size={12} /> Reagendar para:
                                </span>
                                <div className="flex flex-wrap gap-2">
                                  <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2 rounded-full border border-border hover:bg-primary/10" disabled={loading} onClick={() => handleQuickReschedule(event, 15)}>+15d</Button>
                                  <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2 rounded-full border border-border hover:bg-primary/10" disabled={loading} onClick={() => handleQuickReschedule(event, 20)}>+20d</Button>
                                  <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2 rounded-full border border-border hover:bg-primary/10" disabled={loading} onClick={() => handleQuickReschedule(event, 30)}>+30d</Button>
                                </div>
                              </div>
                              
                              {isPending && (
                                <Button 
                                  size="sm" 
                                  className="rounded-full bg-gold-gradient text-primary-foreground font-bold gap-2 px-4 shadow-lg animate-instagram-pulse"
                                  onClick={() => handleConfirmBooking(event)}
                                  disabled={loading}
                                >
                                  {loading ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                                  {loading ? "Gravando..." : "Confirmar"}
                                </Button>
                              )}
                            </div>

                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="icon" 
                                onClick={() => { setAnamneseClient(event); }}
                                disabled={loading}
                                className={cn(
                                  "h-9 w-9 rounded-full border-primary/20 hover:bg-primary/10 relative",
                                  isAnamneseFilled ? "text-green-500 border-green-500/20" : "text-primary"
                                )}
                                title={isAnamneseFilled ? "Ficha Preenchida" : "Ficha Pendente"}
                              >
                                <ClipboardList size={16} />
                              </Button>
                              {event.whatsapp && (
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  onClick={() => { setReminderClient(event); }}
                                  disabled={loading}
                                  className="h-9 w-9 rounded-full border-green-500/20 text-green-500 hover:bg-green-500/10"
                                  title="Enviar Lembrete"
                                >
                                  <Send size={16} />
                                </Button>
                              )}
                              <Button 
                                variant="outline" 
                                size="icon" 
                                onClick={() => { setEditingEvent(event); }}
                                disabled={loading}
                                className="h-9 w-9 rounded-full border-primary/20 text-primary hover:bg-primary/10"
                                title="Editar"
                              >
                                <Edit2 size={16} />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                onClick={() => { setDeleteConfirmId(event.id); }}
                                disabled={loading}
                                className="h-9 w-9 rounded-full border-destructive/20 text-destructive hover:bg-destructive/10"
                                title="Excluir"
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-primary/20 italic border-dashed border-2 border-border rounded-2xl gap-4">
                      <p className="text-sm">Nenhum agendamento.</p>
                      {onAddNew && (
                        <Button 
                          variant="ghost" 
                          onClick={() => { onAddNew(day); }}
                          className="rounded-full gap-2 border border-primary/20 text-primary hover:bg-primary/5"
                          disabled={loading}
                        >
                          <PlusCircle size={18} />
                          Agendar Cliente
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AnamneseModal 
        client={anamneseClient}
        isOpen={!!anamneseClient}
        onClose={() => setAnamneseClient(null)}
        onSave={handleSaveAnamnese}
      />

      <ReminderDialog 
        client={reminderClient}
        isOpen={!!reminderClient}
        onClose={() => setReminderClient(null)}
      />

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && !loading && setDeleteConfirmId(null)}>
        <AlertDialogContent className="rounded-[2rem] border-border bg-background p-8 text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-headline text-gold-gradient">Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Esta ação é irreversível. Todas as informações deste agendamento serão removidas permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex gap-3">
            <AlertDialogCancel className="flex-1 rounded-xl border-border bg-transparent text-foreground hover:bg-muted" disabled={loading}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={loading}
              className="flex-1 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

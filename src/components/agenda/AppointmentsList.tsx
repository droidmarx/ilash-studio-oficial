"use client"

import { useState } from "react"
import { Client } from "@/lib/api"
import { format, parseISO, parse, isValid, getMonth } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Clock, Send, Cake, Star, Calendar, CheckCircle2 } from "lucide-react"
import { cn, parseBirthday } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ReminderDialog } from "./ReminderDialog"
import { AppointmentForm } from "./AppointmentForm"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface AppointmentsListProps {
  appointments: Client[]
  onEdit: (id: string, data: Partial<Client>) => Promise<void>
  loading?: boolean
}

export function AppointmentsList({ appointments, onEdit, loading }: AppointmentsListProps) {
  const [selectedForReminder, setSelectedForReminder] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const getEventDate = (dataStr: string) => {
    try {
      let d;
      if (dataStr.includes('T')) d = parseISO(dataStr);
      else d = parse(dataStr, 'dd/MM/yyyy HH:mm', new Date());
      
      return isValid(d) ? d : new Date();
    } catch (e) { return new Date(); }
  };

  const isBirthdayMonth = (client: Client) => {
    if (!client.aniversario) return false;
    const appDate = getEventDate(client.data);
    const bday = parseBirthday(client.aniversario);
    if (!bday) return false;
    return getMonth(appDate) === getMonth(bday);
  }

  return (
    <>
      <Card className="rounded-[2.5rem] border-border shadow-2xl bg-card backdrop-blur-md overflow-hidden animate-in slide-in-from-right duration-700">
        <CardHeader className="bg-gold-gradient py-8">
          <CardTitle className="flex items-center gap-3 font-headline text-4xl text-primary-foreground">
            <Star className="fill-primary-foreground" size={24} />
            Agenda Vip
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-8">
          <div className="space-y-4">
            {appointments.length > 0 ? (
              appointments.slice(0, 8).map((app, idx) => {
                const date = getEventDate(app.data);
                const isFirst = idx === 0;
                const isBday = isBirthdayMonth(app);

                return (
                  <div 
                    key={app.id} 
                    onClick={() => setEditingClient(app)}
                    className={cn(
                      "group relative flex items-center gap-4 p-4 rounded-3xl transition-all duration-500 border border-border/50 cursor-pointer hover:shadow-lg",
                      isFirst ? "bg-primary/10 border-primary/30 shadow-[0_0_15px_rgba(var(--primary),0.1)]" : "hover:bg-foreground/5"
                    )}
                  >
                    <div className={cn(
                      "flex flex-col items-center justify-center min-w-[56px] h-[56px] rounded-2xl font-bold transition-transform group-hover:scale-105",
                      isFirst ? "bg-gold-gradient text-primary-foreground" : "bg-muted text-primary border border-primary/20"
                    )}>
                      <span className="text-[10px] uppercase font-black leading-none">{format(date, 'MMM', { locale: ptBR })}</span>
                      <span className="text-xl leading-none">{format(date, 'dd')}</span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <h4 className="font-bold text-base md:text-lg text-foreground truncate group-hover:text-primary transition-colors">
                          {app.nome}
                        </h4>
                        {app.confirmado === false ? (
                          <div className="flex items-center gap-1.5 ml-1">
                            <div className="w-2 h-2 rounded-full bg-primary animate-instagram-pulse shadow-[0_0_8px_rgba(var(--primary),0.6)]" />
                            <span className="text-[10px] font-black text-primary uppercase tracking-tighter">Pendente</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 ml-1">
                            <CheckCircle2 size={12} className="text-green-500" />
                            <span className="text-[10px] font-black text-green-500 uppercase tracking-tighter">Confirmado</span>
                          </div>
                        )}
                        {isBday && (
                          <Cake size={14} className="text-primary animate-pulse shrink-0" />
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-[10px] md:text-xs font-semibold text-primary/80">
                          <Calendar size={12} className="shrink-0" />
                          <span className="capitalize">{format(date, 'EEEE', { locale: ptBR })}</span>
                          <span className="opacity-40">•</span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} className="shrink-0" />
                            {format(date, 'HH:mm')}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1">
                            {app.servico}
                          </span>
                          <span className={cn(
                            "text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border transition-colors",
                            app.tipo === 'Aplicação' ? "bg-primary/20 border-primary/40 text-primary" : 
                            app.tipo === 'Manutenção' ? "bg-primary/10 border-primary/20 text-primary/70" :
                            "bg-muted/50 border-border text-muted-foreground"
                          )}>
                            {app.tipo}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center shrink-0">
                      {app.whatsapp && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 rounded-full text-primary hover:bg-primary/10 transition-colors z-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedForReminder(app);
                          }}
                          title="Enviar Lembrete"
                        >
                          <Send size={18} />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-20">
                <Star className="mx-auto mb-4 text-primary/20" size={48} />
                <p className="text-primary/30 text-lg font-light italic">Sua agenda Vip está pronta.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ReminderDialog 
        client={selectedForReminder}
        isOpen={!!selectedForReminder}
        onClose={() => setSelectedForReminder(null)}
      />

      <Dialog open={!!editingClient} onOpenChange={(open) => { if (!open) { setEditingClient(null); } }}>
        <DialogContent className="w-[95vw] sm:max-w-[500px] rounded-[2rem] bg-background border-border p-4 md:p-8 max-h-[95vh] overflow-y-auto text-foreground">
          <DialogHeader>
            <DialogTitle className="text-3xl md:text-4xl font-headline text-gold-gradient">Editar Agendamento</DialogTitle>
          </DialogHeader>
          <div className="mt-4 md:mt-6">
            {editingClient && (
              <AppointmentForm 
                initialData={editingClient} 
                loading={loading}
                onSubmit={async (data) => {
                  await onEdit(editingClient.id, data)
                  setEditingClient(null)
                }} 
                onCancel={() => setEditingClient(null)} 
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

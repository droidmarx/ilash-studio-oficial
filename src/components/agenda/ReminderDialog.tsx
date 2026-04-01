
"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Client } from "@/lib/api"
import { MessageSquare, Zap, RotateCw, Trash2, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { useState, useEffect } from "react"

interface ReminderDialogProps {
  client: Client | null
  isOpen: boolean
  onClose: () => void
}

export function ReminderDialog({ client, isOpen, onClose }: ReminderDialogProps) {
  const [templates, setTemplates] = useState<any>(null)

  useEffect(() => {
    if (isOpen) {
      supabase.from('configuracoes').select('valor').eq('nome', 'CUSTOM_MESSAGES').maybeSingle().then(({ data }) => {
        if (data?.valor) setTemplates(JSON.parse(data.valor))
      })
    }
  }, [isOpen])

  if (!client) return null

  const handleSend = (tipo: string) => {
    let message = ""
    const dateStr = client.data ? new Date(client.data).toLocaleDateString('pt-BR') : ""
    const timeStr = client.data ? new Date(client.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ""

    if (templates) {
      const template = tipo === 'CONFIRMACAO' ? templates.confirmacao : templates.lembrete
      message = template
        .replace(/{nome}/g, client.nome)
        .replace(/{servico}/g, client.servico || "")
        .replace(/{data}/g, dateStr)
        .replace(/{hora}/g, timeStr)
    } else {
      message = tipo === 'CONFIRMACAO' 
        ? `Olá ${client.nome}! Confirmamos seu horário para ${client.servico} no dia ${dateStr} às ${timeStr}.`
        : `Oi ${client.nome}! Passando para lembrar do seu horário de ${client.servico} amanhã, ${dateStr}, às ${timeStr}.`
    }

    const cleanPhone = client.whatsapp?.replace(/\D/g, "") || "";
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    onClose();
  }

  const reminderTypes = [
    { id: "Aplicação", label: "Lembrete de Aplicação", desc: "Mensagem para novo conjunto", icon: <Zap size={20} /> },
    { id: "Manutenção", label: "Lembrete de Manutenção", desc: "Mensagem para reposição", icon: <RotateCw size={20} /> },
    { id: "Remoção", label: "Lembrete de Remoção", desc: "Mensagem para retirada total", icon: <Trash2 size={20} /> }
  ];

  // Ordena para que o tipo agendado pela cliente fique no topo da lista
  const sortedTypes = [...reminderTypes].sort((a, b) => {
    if (a.id === client.tipo) return -1;
    if (b.id === client.tipo) return 1;
    return 0;
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-[420px] rounded-[2.5rem] bg-card border-border p-6 md:p-8 text-foreground shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-3xl font-headline text-gold-gradient flex items-center gap-2">
            <MessageSquare className="text-primary" size={28} />
            Escolher Lembrete
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-[10px] uppercase tracking-[0.2em] font-black pt-2">
            Qual mensagem enviar para {client.nome}?
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-8">
          {sortedTypes.map((type) => {
            const isSuggested = type.id === client.tipo;
            return (
              <Button 
                key={type.id}
                onClick={() => handleSend(type.id)}
                className={cn(
                  "relative h-20 rounded-2xl flex items-center justify-start gap-4 transition-all group overflow-hidden border-2",
                  isSuggested 
                    ? "bg-primary/10 border-primary shadow-[0_0_20px_rgba(var(--primary),0.3)]" 
                    : "bg-muted/30 border-transparent hover:bg-primary/5 hover:border-primary/20"
                )}
              >
                {isSuggested && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground p-2 rounded-bl-xl flex items-center justify-center">
                    <Star size={12} className="fill-current" />
                  </div>
                )}
                
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                  isSuggested ? "bg-primary text-primary-foreground" : "bg-muted text-primary/40"
                )}>
                  {type.icon}
                </div>

                <div className="text-left">
                  <p className={cn("font-bold text-base", isSuggested ? "text-primary" : "text-foreground")}>
                    {type.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">{type.desc}</p>
                </div>
                
                {isSuggested && <div className="ml-auto w-2 h-2 rounded-full bg-primary animate-ping" />}
              </Button>
            );
          })}
        </div>

        <Button variant="ghost" onClick={onClose} className="w-full rounded-2xl h-12 text-muted-foreground font-bold hover:text-foreground">
          Voltar para Agenda
        </Button>
      </DialogContent>
    </Dialog>
  )
}

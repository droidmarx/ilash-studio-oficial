
"use client"

import { format, isToday } from "date-fns"
import { Client } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Cake, Sparkles } from "lucide-react"

interface CalendarDayProps {
  day: Date
  events: Client[]
  birthdays: Client[]
  isCurrentMonth: boolean
  onClick: (day: Date, events: Client[], birthdays: Client[]) => void
}

export function CalendarDay({ day, events, birthdays, isCurrentMonth, onClick }: CalendarDayProps) {
  const isTodayDate = isToday(day)
  const hasEvents = events.length > 0
  const hasBirthdays = birthdays.length > 0
  
  // Filtra agendamentos vindos do Instagram que ainda estão pendentes
  const pendingInstagramEvents = events.filter(e => 
    e.confirmado === false && e.observacoes?.toLowerCase().includes("instagram")
  )

  // Ordena os eventos para mostrar os confirmados primeiro nos pontinhos
  const sortedEvents = [...events].sort((a, b) => {
    if (a.confirmado === b.confirmado) return 0;
    return a.confirmado ? -1 : 1;
  });

  return (
    <div
      onClick={() => {
        if (isCurrentMonth) {
          onClick(day, events, birthdays);
        }
      }}
      className={cn(
        "calendar-day",
        !isCurrentMonth && "not-current-month",
        isTodayDate && "today",
        (hasEvents || hasBirthdays) && "has-event",
        isCurrentMonth && "group"
      )}
    >
      <div className="h-6 flex items-center justify-center w-full">
        {hasBirthdays && isCurrentMonth && (
          <div className="relative animate-in fade-in zoom-in duration-500">
            <Cake size={16} className="text-primary animate-pulse" />
            <Sparkles size={10} className="absolute -top-1 -right-1 text-foreground animate-bounce" />
          </div>
        )}
      </div>
      
      <div className="flex-1 flex items-center justify-center w-full">
        <span className={cn(
          "text-xl font-bold transition-all duration-300 leading-none",
          isTodayDate ? "text-primary scale-110" : "text-foreground group-hover:text-primary group-hover:scale-110"
        )}>
          {format(day, 'd')}
        </span>
      </div>
      
      <div className="h-6 flex items-center justify-center w-full">
        {hasEvents && isCurrentMonth && (
          <div className="flex -space-x-1.5 justify-center items-center">
            {pendingInstagramEvents.length > 0 && (
              <div 
                className="w-3.5 h-3.5 rounded-full border-2 border-primary shadow-[0_0_12px_rgba(var(--primary),0.6)] animate-instagram-pulse z-10 mr-1.5" 
                title="Novo Agendamento Instagram Pendente"
              />
            )}
            
            {sortedEvents.slice(0, 3).map((e, idx) => {
              const isPending = e.confirmado === false;
              let dotClass = "";

              if (isPending) {
                // Estilo para agendamentos pendentes: piscante como na aba de pendentes
                dotClass = "bg-primary animate-instagram-pulse shadow-[0_0_8px_rgba(var(--primary),0.6)] border-none";
              } else {
                // Estilos para agendamentos confirmados (originais)
                if (e.tipo === 'Aplicação') dotClass = "bg-primary border-4 border-white shadow-[0_0_12px_rgba(255,255,255,0.9)] scale-125 z-10";
                else if (e.tipo === 'Manutenção') dotClass = "bg-primary/70 border-4 border-primary shadow-[0_0_8px_rgba(var(--primary),0.4)]";
                else if (e.tipo === 'Remoção') dotClass = "bg-primary/25 border-4 border-primary/20";
                else dotClass = "bg-muted border-border/50";
              }
              
              return (
                <div 
                  key={idx}
                  className={cn(
                    "w-4 h-4 rounded-full border shadow-lg transition-transform group-hover:scale-110",
                    dotClass
                  )}
                  title={`${e.tipo} ${isPending ? '(Pendente)' : '(Confirmado)'}`}
                />
              )
            })}
            
            {(events.length > 3) && (
              <span className="text-[10px] font-black text-primary ml-1.5 leading-none">
                +{events.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

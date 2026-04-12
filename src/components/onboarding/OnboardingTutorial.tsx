"use client"

import { useState } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Bot, Sparkles, Calendar, Users, CheckCircle2, ArrowRight, ClipboardList } from "lucide-react"
import { cn } from "@/lib/utils"

interface OnboardingTutorialProps {
  isOpen: boolean
  onComplete: (telegramChatId: string) => void
}

export function OnboardingTutorial({ isOpen, onComplete }: OnboardingTutorialProps) {
  const [step, setStep] = useState(1)
  const [chatId, setChatId] = useState("")

  const steps = [
    {
      title: "Bem-vinda ao I Lash Studio!",
      description: "Estamos muito felizes em ter você aqui. Vamos preparar seu estúdio para o sucesso em poucos passos.",
      icon: <Sparkles className="text-primary w-12 h-12" />,
      content: (
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">O I Lash Studio é sua plataforma completa para gestão de agendamentos, clientes e notificações premium.</p>
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
              <Calendar className="text-primary mx-auto mb-2" size={24} />
              <p className="text-[10px] font-bold uppercase tracking-widest">Agenda VIP</p>
            </div>
            <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
              <Users className="text-primary mx-auto mb-2" size={24} />
              <p className="text-[10px] font-bold uppercase tracking-widest">Gestão Clientes</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Configure seu Telegram",
      description: "Super importante! Para receber notificações em tempo real, você precisa configurar seu Chat ID.",
      icon: <Bot className="text-primary w-12 h-12" />,
      content: (
        <div className="space-y-4">
          <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Abra o Telegram e procure por <a href="https://t.me/ilashnotificationbot" target="_blank" className="text-primary underline">@ilashnotificationbot</a></li>
            <li>Inicie o bot e envie o comando <code className="bg-muted px-1 rounded">/myid</code></li>
            <li>Copie o número que ele responder e cole abaixo:</li>
          </ol>
          <div className="space-y-2 pt-2">
            <Label className="text-[10px] font-black uppercase tracking-widest">Seu Chat ID Numérico</Label>
            <Input 
              placeholder="Ex: 123456789" 
              value={chatId}
              onChange={e => setChatId(e.target.value)}
              className="rounded-xl bg-muted/50 border-primary/20 h-12 font-mono"
            />
          </div>
          <p className="text-[10px] text-primary/60 italic">Dica: Você pode mudar isso depois nas configurações!</p>
        </div>
      )
    },
    {
      title: "Tudo Pronto!",
      description: "Sua jornada rumo a um estúdio mais profissional e organizado começa agora.",
      icon: <CheckCircle2 className="text-green-500 w-12 h-12" />,
      content: (
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">Explore o painel, adicione suas primeiras clientes e veja a mágica acontecer.</p>
          <div className="p-6 bg-gold-gradient/10 rounded-3xl border border-primary/20 space-y-2">
            <ClipboardList className="text-primary mx-auto" size={32} />
            <p className="text-xs font-bold text-primary italic">"O sucesso é a soma de pequenos esforços repetidos dia após dia."</p>
          </div>
        </div>
      )
    }
  ]

  const currentStepData = steps[step - 1]

  if (!currentStepData && isOpen) {
    return null;
  }

  const nextStep = () => {
    if (step < steps.length) {
      setStep(step + 1)
    } else {
      onComplete(chatId)
    }
  }

  return (
    <Dialog open={isOpen}>
      <DialogContent className="w-[95vw] sm:max-w-[500px] rounded-[3rem] bg-background border-primary/20 shadow-2xl overflow-hidden p-0">
        <div className="p-8 md:p-10">
          <div className="flex justify-center mb-8 animate-in zoom-in duration-500">
            <div className="p-4 bg-primary/10 rounded-3xl">
              {currentStepData.icon}
            </div>
          </div>

          <DialogHeader className="text-center space-y-4 mb-8">
            <DialogTitle className="text-3xl font-headline text-gold-gradient leading-tight">
              {currentStepData.title}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              {currentStepData.description}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-[200px] mt-4">
            {currentStepData.content}
          </div>

          <DialogFooter className="mt-10 flex flex-col gap-4">
             <div className="flex justify-center gap-2 mb-4">
                {steps.map((_, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-300",
                      step === i + 1 ? "bg-primary w-6" : "bg-primary/20"
                    )} 
                  />
                ))}
             </div>
             <Button 
               onClick={nextStep}
               className="w-full h-14 rounded-2xl bg-gold-gradient text-primary-foreground font-black tracking-widest text-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
             >
               {step === steps.length ? "COMEÇAR AGORA" : "PRÓXIMO"}
               <ArrowRight size={20} />
             </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

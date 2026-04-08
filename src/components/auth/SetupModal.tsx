"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Sparkles, Check, X, Link as LinkIcon, Bot, Calendar, ClipboardList, ChevronRight, Send } from "lucide-react"
import { createProfile, checkSlugAvailability, createRecipient } from "@/lib/api"
import { cn } from "@/lib/utils"

interface SetupModalProps {
  isOpen: boolean
  onComplete: (nome: string, slug: string) => void
}

export function SetupModal({ isOpen, onComplete }: SetupModalProps) {
  const [step, setStep] = useState(1)
  const [nome, setNome] = useState("")
  const [slug, setSlug] = useState("")
  const [loading, setLoading] = useState(false)
  const [checkingSlug, setCheckingSlug] = useState(false)
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [error, setError] = useState("")
  const [perfilCriado, setPerfilCriado] = useState<{id: string, nome: string, slug: string} | null>(null)

  // Step 2 Telegram
  const [chatID, setChatID] = useState("")
  const [testingToken, setTestingToken] = useState(false)
  const [telegramStatus, setTelegramStatus] = useState<"idle" | "success" | "error">("idle")
  
  // Step 3 Carousel
  const [slide, setSlide] = useState(0)

  useEffect(() => {
    if (step === 1) {
      const generated = nome
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
      
      setSlug(generated)
    }
  }, [nome, step])

  useEffect(() => {
    if (step !== 1) return;
    if (!slug || slug.length < 3) {
      setSlugAvailable(null)
      return
    }

    const timer = setTimeout(async () => {
      setCheckingSlug(true)
      const available = await checkSlugAvailability(slug)
      setSlugAvailable(available)
      setCheckingSlug(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [slug, step])

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!slugAvailable || !nome) return

    setLoading(true)
    setError("")

    try {
      const p = await createProfile({ nome_exibicao: nome, slug })
      setPerfilCriado({ id: p.id, nome: p.nome_exibicao, slug: p.slug })
      setStep(2)
    } catch (err: any) {
      setError("Erro ao criar perfil. Tente outro nome ou slug.")
    } finally {
      setLoading(false)
    }
  }

  const handleTestTelegram = async () => {
    if (!chatID || !perfilCriado) return;
    setTestingToken(true)
    setTelegramStatus("idle")
    try {
      await createRecipient({ nome: "Admin Principal", chatID }, perfilCriado.id)
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: perfilCriado.id }),
      })
      if (res.ok) {
        setTelegramStatus("success")
      } else {
        setTelegramStatus("error")
      }
    } catch (error) {
      setTelegramStatus("error")
    } finally {
      setTestingToken(false)
    }
  }

  const handleFinish = () => {
    if (perfilCriado) {
      onComplete(perfilCriado.nome, perfilCriado.slug)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[500px] bg-card/95 backdrop-blur-2xl border-primary/20 rounded-[2.5rem] p-8 shadow-2xl">
        
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <DialogHeader className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-bounce-slow">
                  <Sparkles className="text-primary" size={32} />
                </div>
              </div>
              <DialogTitle className="text-3xl font-headline text-gold-gradient">Bem-vinda ao I Lash Studio!</DialogTitle>
              <DialogDescription className="text-primary/60 text-sm font-medium">
                Vamos configurar o seu espaço exclusivo. Escolha um nome para o seu estúdio e o seu link de agendamento.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateProfile} className="space-y-8 py-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-primary ml-1">Nome do seu Estúdio</Label>
                  <Input
                    placeholder="Ex: Studio Paris, Lash Boutique..."
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="h-14 rounded-2xl bg-muted/30 border-primary/10 focus:ring-primary/20 text-lg transition-all"
                    disabled={loading}
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-primary ml-1">Seu Link de Agendamento</Label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30">
                      <LinkIcon size={18} />
                    </div>
                    <Input
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className={cn(
                        "h-14 pl-12 rounded-2xl bg-muted/30 border-primary/10 focus:ring-primary/20 text-lg transition-all font-mono lowercase",
                        slugAvailable === true && "border-green-500/50 focus:ring-green-500/20",
                        slugAvailable === false && "border-red-500/50 focus:ring-red-500/20"
                      )}
                      disabled={loading}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      {checkingSlug ? <Loader2 className="animate-spin text-primary" size={18} /> : 
                       slugAvailable === true ? <Check className="text-green-500" size={18} /> :
                       slugAvailable === false ? <X className="text-red-500" size={18} /> : null
                      }
                    </div>
                  </div>
                  <p className="text-[10px] text-primary/40 font-bold uppercase tracking-widest px-1">
                    Seu link será: ilash-studio-oficial.vercel.app/s/{slug || "..."}
                  </p>
                </div>
              </div>

              {error && <p className="text-xs text-red-500 text-center font-bold italic">{error}</p>}

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={loading || !slugAvailable || !nome}
                  className="w-full h-16 rounded-3xl bg-gold-gradient text-primary-foreground font-black text-lg gap-2 shadow-xl hover:scale-[1.02] transition-transform active:scale-95 mt-4"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <>Próximo Passo <ChevronRight /></>}
                </Button>
              </DialogFooter>
            </form>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
            <DialogHeader className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Bot className="text-blue-500" size={32} />
                </div>
              </div>
              <DialogTitle className="text-3xl font-headline text-blue-500">Notificações Inteligentes</DialogTitle>
              <DialogDescription className="text-primary/60 text-sm font-medium">
                Queremos te avisar de todos os agendamentos pelo Telegram! 
                Converse com o nosso robô <a href="https://t.me/ilashnotificationbot" target="_blank" className="text-blue-500 font-bold hover:underline">@ilashnotificationbot</a> e envie um "Oi". Ele te informará um Chat ID numérico.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-primary ml-1">Seu Chat ID Numérico</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: 123456789"
                    value={chatID}
                    onChange={(e) => setChatID(e.target.value)}
                    className="h-14 flex-1 rounded-2xl bg-muted/30 border-primary/10 text-lg"
                    disabled={testingToken || telegramStatus === 'success'}
                  />
                  <Button 
                    onClick={handleTestTelegram} 
                    disabled={!chatID || testingToken || telegramStatus === 'success'}
                    className={cn(
                      "h-14 px-6 rounded-2xl transition-all",
                      telegramStatus === 'success' ? "bg-green-500 text-white" : "bg-blue-500 text-white hover:bg-blue-600"
                    )}
                  >
                    {testingToken ? <Loader2 className="animate-spin" /> : 
                     telegramStatus === 'success' ? <Check /> : "Testar"}
                  </Button>
                </div>
                {telegramStatus === 'success' && <p className="text-xs text-green-500 font-bold px-1 text-center">Incrível! Mensagem de teste enviada com sucesso no Telegram.</p>}
                {telegramStatus === 'error' && <p className="text-xs text-red-500 font-bold px-1 text-center">Ops! Não conseguimos enviar. Verifique o Chat ID ou inicie a conversa no robô de novo.</p>}
              </div>
            </div>

            <DialogFooter className="flex-col gap-2">
              <Button
                onClick={() => setStep(3)}
                className="w-full h-16 rounded-3xl bg-gold-gradient text-primary-foreground font-black text-lg gap-2 shadow-xl hover:scale-[1.02] transition-transform active:scale-95"
              >
                Próximo Passo <ChevronRight />
              </Button>
              <Button onClick={() => setStep(3)} variant="ghost" className="text-xs text-primary/40 uppercase tracking-widest">
                Pular essa etapa
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
            <DialogHeader className="text-center">
              <DialogTitle className="text-3xl font-headline text-gold-gradient">Conheça seu Painel</DialogTitle>
              <DialogDescription className="text-primary/60 text-sm font-medium pt-2">
                Tudo pronto para decolar a sua agenda profissional. Veja as principais funções:
              </DialogDescription>
            </DialogHeader>

            <div className="relative overflow-hidden h-[200px] flex items-center justify-center bg-muted/20 border border-primary/10 rounded-[2rem]">
                {slide === 0 && (
                  <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center animate-in slide-in-from-right-8 fade-in">
                    <Calendar className="text-primary mb-4" size={48} />
                    <h3 className="font-bold text-xl text-foreground">Sua Agenda de Elite</h3>
                    <p className="text-sm text-foreground/60 mt-2">Visão intuitiva dos seus agendamentos, clientes pendentes e lembretes rápidos via WhatsApp.</p>
                  </div>
                )}
                {slide === 1 && (
                  <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center animate-in slide-in-from-right-8 fade-in">
                    <ClipboardList className="text-green-500 mb-4" size={48} />
                    <h3 className="font-bold text-xl text-foreground">Ficha de Anamnese</h3>
                    <p className="text-sm text-foreground/60 mt-2">Sua cliente assina pelo celular acessando seu Link exclusivo e você monitora no painel as condições.</p>
                  </div>
                )}
                {slide === 2 && (
                  <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center animate-in slide-in-from-right-8 fade-in">
                    <Sparkles className="text-primary mb-4" size={48} />
                    <h3 className="font-bold text-xl text-foreground">Estilos e Mensagens</h3>
                    <p className="text-sm text-foreground/60 mt-2">No menu de configurações (ícone de engrenagem) você deixa o painel com a sua cara e muda os templates de mensagem.</p>
                  </div>
                )}
            </div>

            <div className="flex justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <button 
                  key={i} 
                  onClick={() => setSlide(i)} 
                  className={cn("w-2 h-2 rounded-full transition-all", slide === i ? "bg-primary w-6" : "bg-primary/20")}
                />
              ))}
            </div>

            <DialogFooter className="flex-col gap-2">
              {slide < 2 ? (
                <Button
                  onClick={() => setSlide(s => s + 1)}
                  className="w-full h-16 rounded-3xl bg-primary text-primary-foreground font-black text-lg shadow-xl"
                >
                  Próximo Exemplo
                </Button>
              ) : (
                <Button
                  onClick={handleFinish}
                  className="w-full h-16 rounded-3xl bg-gold-gradient text-primary-foreground font-black text-lg gap-2 shadow-xl hover:scale-[1.02] transition-transform active:scale-95"
                >
                  Começar a Usar <Check />
                </Button>
              )}
            </DialogFooter>
          </div>
        )}

      </DialogContent>
    </Dialog>
  )
}

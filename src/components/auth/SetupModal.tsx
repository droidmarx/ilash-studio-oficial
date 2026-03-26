"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Sparkles, Check, X, Link as LinkIcon } from "lucide-react"
import { createProfile, checkSlugAvailability } from "@/lib/api"
import { cn } from "@/lib/utils"

interface SetupModalProps {
  isOpen: boolean
  onComplete: (nome: string, slug: string) => void
}

export function SetupModal({ isOpen, onComplete }: SetupModalProps) {
  const [nome, setNome] = useState("")
  const [slug, setSlug] = useState("")
  const [loading, setLoading] = useState(false)
  const [checkingSlug, setCheckingSlug] = useState(false)
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [error, setError] = useState("")

  // Gera o slug automaticamente a partir do nome
  useEffect(() => {
    const generated = nome
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-0]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
    
    setSlug(generated)
  }, [nome])

  // Verifica disponibilidade do slug
  useEffect(() => {
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
  }, [slug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!slugAvailable || !nome) return

    setLoading(true)
    setError("")

    try {
      await createProfile({ nome_exibicao: nome, slug })
      onComplete(nome, slug)
    } catch (err: any) {
      setError("Erro ao criar perfil. Tente outro nome ou slug.")
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[500px] bg-card/95 backdrop-blur-2xl border-primary/20 rounded-[2.5rem] p-8 shadow-2xl">
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

        <form onSubmit={handleSubmit} className="space-y-8 py-6">
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
                Seu link será: ilash.vercel.app/s/{slug || "..."}
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
              {loading ? <Loader2 className="animate-spin" /> : "Criar Meu Estúdio VIP"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Settings, Send, MessageSquare, User, Trash2, PlusCircle, Loader2, Key, Bot, XCircle, Sparkles, Clock, Palmtree, RefreshCw, Calendar, Bell, ShieldCheck, Crown } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"
import { 
  Recipient, getRecipients, createRecipient, updateRecipient, deleteRecipient, 
  setTelegramWebhook, getWebhookStatus, updateWebhookStatus, getTelegramToken,
  getWorkingHours, updateWorkingHours, WorkingHours, WorkingDay, defaultWorkingHours,
  getVacationMode, updateVacationMode, VacationMode, defaultVacationMode,
  getTelegramConfig, updateTelegramConfig, TelegramSettings, defaultTelegramSettings,
  getTechniques, updateTechniques, defaultTechniques,
  getProfile, updateProfile, Perfil
} from "@/lib/api"
import { ThemeToggle } from "./ThemeToggle"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  theme: string
  toggleTheme: (theme: string) => void
}

export function SettingsModal({ 
  isOpen, 
  onClose, 
  onSave,
  theme,
  toggleTheme
}: SettingsModalProps) {
// const [botToken, setBotToken] = useState("") (Removido: o token agora é global no servidor)
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [workingHours, setWorkingHours] = useState<WorkingHours>(defaultWorkingHours)
  const [vacationMode, setVacationMode] = useState<VacationMode>(defaultVacationMode)
  const [telegramConfig, setTelegramConfig] = useState<TelegramSettings>(defaultTelegramSettings)
  const [techniques, setTechniques] = useState<string[]>(defaultTechniques)
  const [newTechnique, setNewTechnique] = useState("")
  const [testingToken, setTestingToken] = useState(false)
  
  const [perfil, setPerfil] = useState<Partial<Perfil>>({ nome_exibicao: "", slug: "" })
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      loadRecipients()
    }
  }, [isOpen])

  const loadRecipients = async () => {
    setLoading(true)
    try {
      const data = await getRecipients()
      const persons = data.filter(r => 
        !['SYSTEM_TOKEN', 'SUMMARY_STATE', 'MAIN_API_URL', 'WEBHOOK_STATE', 'WORKING_HOURS', 'VACATION_MODE', 'TELEGRAM_CONFIG', 'TECHNIQUES'].includes(r.nome)
      )
      setRecipients(persons.slice(0, 3))
      
      // O token agora é global e não deve ser exposto ao cliente
      // const token = await getTelegramToken()
      // if (token) setBotToken(token)

      const wh = await getWorkingHours()
      setWorkingHours(wh)
      
      const vm = await getVacationMode()
      setVacationMode(vm)
      
      const tc = await getTelegramConfig()
      setTelegramConfig(tc)

      const tks = await getTechniques()
      setTechniques(tks)

      const p = await getProfile()
      if (p) setPerfil(p as Perfil)
      
    } catch (error) {
      console.error("Erro ao carregar configurações", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddRecipient = () => {
    if (recipients.length >= 3) return
    setRecipients([...recipients, { id: 'temp-' + Date.now(), nome: "", chatID: "" }])
  }

  const handleRemoveRecipient = (index: number) => {
    const newRecipients = [...recipients]
    newRecipients.splice(index, 1)
    setRecipients(newRecipients)
  }

  const handleUpdateRecipientField = (index: number, field: 'nome' | 'chatID', value: string) => {
    const newRecipients = [...recipients]
    newRecipients[index] = { ...newRecipients[index], [field]: value }
    setRecipients(newRecipients)
  }

  const handleTestToken = async () => {
    // Validação de botToken removida pois o token é gerencial no servidor
    setTestingToken(true)
    try {
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: perfil.id }),
      })
      if (res.ok) {
        toast({ title: "Sucesso", description: "Mensagem de teste enviada para os administradores ativos." })
      } else {
        const err = await res.json()
        throw new Error(err.error || "Erro ao testar")
      }
    } catch (error: any) {
      console.error("Erro no teste do Telegram:", error);
      toast({ 
        variant: "destructive", 
        title: "Erro no Teste", 
        description: error.message || "Verifique sua lista de destinatários." 
      })
    } finally {
      setTestingToken(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateWorkingHours(workingHours);
      await updateVacationMode(vacationMode);
      await updateTelegramConfig(telegramConfig);
      await updateTechniques(techniques);

      const remoteRecipients = await getRecipients()
      for (const remote of remoteRecipients) {
        const isSystemKey = [
          'SYSTEM_TOKEN', 'SUMMARY_STATE', 'MAIN_API_URL', 'WEBHOOK_STATE', 
          'WORKING_HOURS', 'VACATION_MODE', 'TELEGRAM_CONFIG', 'TECHNIQUES', 'PERFIL'
        ].includes(remote.nome);
        if (!isSystemKey && !recipients.find(r => r.id === remote.id)) {
          await deleteRecipient(remote.id)
        }
      }
      for (const local of recipients) {
        if (local.id.startsWith('temp-')) {
          await createRecipient({ nome: local.nome, chatID: local.chatID })
        } else {
          await updateRecipient(local)
        }
      }

      const p = perfil as Perfil;
      if (p.nome_exibicao || p.slug) {
        await updateProfile(p);
      }

      toast({ title: "Configurações Salvas", description: "Configurações sincronizadas com sucesso." })
      onSave()
      onClose()
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast({ variant: "destructive", title: "Erro ao Salvar", description: error.message || "Falha ao sincronizar dados." })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-[600px] rounded-[2rem] bg-background border-border p-6 md:p-8 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-headline text-gold-gradient flex items-center gap-3">
            <Settings className="text-primary" size={28} />
            Configurações do Studio
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Gerencie o robô de notificações e a aparência do sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 py-6">
          {/* Sessão: Identidade */}
          <div className="space-y-4">
            <Label className="text-lg font-bold flex items-center gap-2 text-primary">
              <Crown size={20} /> Identidade do Studio
            </Label>
            <div className="bg-muted/30 p-4 rounded-2xl border border-border space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-primary/60">Nome de Exibição</Label>
                <Input 
                  value={perfil.nome_exibicao} 
                  onChange={(e) => setPerfil({...perfil, nome_exibicao: e.target.value})}
                  className="rounded-xl h-12 bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-primary/60">Link do Agendamento</Label>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center bg-background border border-border rounded-xl px-3 h-12">
                   <span className="text-xs text-muted-foreground mr-1">/s/</span>
                   <input 
                      value={perfil.slug} 
                      onChange={(e) => {
                        const s = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                        setPerfil({...perfil, slug: s})
                      }}
                      className="bg-transparent border-none outline-none text-sm flex-1"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground italic">Link atual: ilash-studio-oficial.vercel.app/s/{perfil.slug}</p>
              </div>
            </div>
          </div>

          <Separator className="bg-primary/10" />

          {/* Sessão: Aparência e Técnicas */}
          <div className="space-y-6">
            <div className="space-y-4">
              <Label className="text-lg font-bold flex items-center gap-2 text-primary">
                <Sparkles size={20} /> Aparência e Serviços
              </Label>
              <div className="flex items-center justify-between bg-muted/30 p-4 rounded-2xl border border-border">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold">Modo Escuro</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Alternar entre tema claro e escuro</p>
                </div>
                <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
              </div>
            </div>
            
            <div className="bg-muted/30 p-4 rounded-2xl border border-border space-y-4">
              <div className="flex flex-wrap gap-2">
                {techniques.map((tech, index) => (
                  <div key={index} className="flex items-center gap-2 bg-background border border-border shadow-sm rounded-full px-3 py-1.5 text-sm font-semibold">
                    <span>{tech}</span>
                    <button onClick={() => setTechniques(techniques.filter((_, i) => i !== index))} className="text-muted-foreground hover:text-destructive">
                      <XCircle size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 h-10">
                <Input 
                  placeholder="Nova técnica..." 
                  value={newTechnique}
                  onChange={(e) => setNewTechnique(e.target.value)}
                  className="h-full rounded-xl bg-background border-border text-xs flex-1"
                />
                <Button 
                  onClick={() => {
                    if (newTechnique.trim() && !techniques.includes(newTechnique.trim())) {
                      setTechniques([...techniques, newTechnique.trim()]);
                      setNewTechnique("");
                    }
                  }}
                  disabled={!newTechnique.trim()}
                  className="h-full rounded-xl px-4 text-xs font-bold"
                >
                  <PlusCircle size={14} /> Add
                </Button>
              </div>
            </div>
          </div>

          <Separator className="bg-primary/10" />

          {/* Sessão: Agenda e Notificações */}
          <div className="space-y-6">
            <Label className="text-lg font-bold flex items-center gap-2 text-primary">
              <Calendar size={20} /> Agenda e Notificações
            </Label>
            
            {/* Modo Férias */}
            <div className="bg-muted/30 p-4 rounded-2xl border border-border space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold flex items-center gap-2">
                    <Palmtree size={16} className="text-primary" /> Modo Férias
                  </p>
                </div>
                <Switch 
                  checked={vacationMode.active} 
                  onCheckedChange={(c) => setVacationMode({...vacationMode, active: c})} 
                />
              </div>
              {vacationMode.active && (
                <Textarea 
                  value={vacationMode.message}
                  onChange={(e) => setVacationMode({...vacationMode, message: e.target.value})}
                  className="resize-none h-16 rounded-xl bg-background border-border text-xs"
                />
              )}
            </div>

            {/* Configurações do Robô */}
            <div className="bg-muted/30 p-4 rounded-2xl border border-border space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold flex items-center gap-2">
                    <RefreshCw size={16} className="text-primary" /> Resumo Diário (8h)
                  </p>
                </div>
                <Switch 
                  checked={telegramConfig.dailySummary} 
                  onCheckedChange={(c) => setTelegramConfig({...telegramConfig, dailySummary: c})} 
                />
              </div>
              <Separator className="bg-border/50" />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold flex items-center gap-2">
                    <Bell size={16} className="text-primary" /> Aviso 2h Antes
                  </p>
                </div>
                <Switch 
                  checked={telegramConfig.reminder2h} 
                  onCheckedChange={(c) => setTelegramConfig({...telegramConfig, reminder2h: c})} 
                />
              </div>
            </div>

            {/* Horário de Trabalho */}
            <div className="bg-muted/30 p-4 rounded-2xl border border-border space-y-3">
              <Label className="text-xs font-bold uppercase tracking-widest text-primary/60">Horário de Atendimento</Label>
              <div className="space-y-2">
                {['seg','ter','qua','qui','sex','sab','dom'].map(k => {
                  const day = k as keyof WorkingHours;
                  const dayMap: Record<string, string> = { seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex', sab: 'Sab', dom: 'Dom' };
                  return (
                    <div key={k} className="flex items-center gap-3">
                      <div className="flex items-center gap-2 w-16">
                        <Switch checked={workingHours[day].active} onCheckedChange={(c) => setWorkingHours({...workingHours, [day]: {...workingHours[day], active: c}})} />
                        <span className="text-[10px] font-bold">{dayMap[k]}</span>
                      </div>
                      <Input type="time" value={workingHours[day].start} onChange={(e) => setWorkingHours({...workingHours, [day]: {...workingHours[day], start: e.target.value}})} disabled={!workingHours[day].active} className="h-7 text-[10px] px-2 rounded-lg bg-background w-16" />
                      <span className="text-[10px] text-muted-foreground">até</span>
                      <Input type="time" value={workingHours[day].end} onChange={(e) => setWorkingHours({...workingHours, [day]: {...workingHours[day], end: e.target.value}})} disabled={!workingHours[day].active} className="h-7 text-[10px] px-2 rounded-lg bg-background w-16" />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <Separator className="bg-primary/10" />

          {/* Sessão: Destinatários */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-bold flex items-center gap-2 text-primary">
                <Send size={20} /> Destinatários de Alerta
              </Label>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleTestToken} disabled={testingToken || !recipients.some(r => r.chatID?.trim())} className="h-8 text-[10px] rounded-full gap-2">
                  {testingToken ? <Loader2 size={10} className="animate-spin" /> : <ShieldCheck size={10} />} Testar
                </Button>
                <Button size="sm" variant="ghost" onClick={handleAddRecipient} disabled={recipients.length >= 3 || loading} className="text-primary hover:bg-primary/10 h-8 gap-1 text-[10px]">
                  <PlusCircle size={14} /> Add
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {loading ? (
                <div className="flex justify-center p-4 text-primary"><Loader2 className="animate-spin" /></div>
              ) : recipients.map((r, index) => (
                <div key={r.id} className="bg-muted/30 p-3 rounded-xl border border-border space-y-2 relative group">
                  <button onClick={() => handleRemoveRecipient(index)} className="absolute top-1.5 right-1.5 text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={12} />
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Nome" value={r.nome} onChange={(e) => handleUpdateRecipientField(index, 'nome', e.target.value)} className="h-8 text-[10px] bg-background border-border" />
                    <Input placeholder="Chat ID" value={r.chatID} onChange={(e) => handleUpdateRecipientField(index, 'chatID', e.target.value)} className="h-8 text-[10px] bg-background border-border" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
          <Button variant="ghost" onClick={onClose} disabled={saving} className="rounded-xl h-10 text-xs">Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 rounded-xl h-10 bg-gold-gradient text-primary-foreground font-bold text-sm tracking-wide">
            {saving ? <Loader2 className="animate-spin" /> : "Salvar Configurações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

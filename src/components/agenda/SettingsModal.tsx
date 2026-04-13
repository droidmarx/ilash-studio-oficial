"use client"
import { useAuth } from "@/hooks/use-auth"

import { useState, useEffect } from "react"
import { Settings, Send, MessageSquare, User, Trash2, PlusCircle, Loader2, Key, Bot, XCircle, Sparkles, Clock, Palmtree, RefreshCw, Calendar, Bell, ShieldCheck, Crown, Check, MessageCircle, Type } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
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
  getProfile, updateProfile, Perfil,
  getCustomMessages, updateCustomMessages, CustomMessages, defaultCustomMessages
} from "@/lib/api"


interface ThemeToggleProps {
  theme: string
  toggleTheme: (theme: string) => void
}

function ThemeToggle({ theme, toggleTheme }: ThemeToggleProps) {
  const themes = [
    { id: 'light', name: 'Feminina', color: 'bg-[#FFF5F7] ring-[#E8A0BF]' },
    { id: 'dark', name: 'Estúdio Escuro', color: 'bg-[#111111] ring-[#BF953F]' },
    { id: 'modern', name: 'Moderna', color: 'bg-[#0F172A] ring-[#3B82F6]' },
    { id: 'elegant', name: 'Elegante', color: 'bg-[#0B0B0B] ring-[#D4AF37]' },
    { id: 'minimalist', name: 'Minimalista', color: 'bg-[#FFFFFF] ring-[#0F172A]' },
    { id: 'vibrant', name: 'Vibrante', color: 'bg-[#1A1A1A] ring-[#FF006E]' },
  ]

  return (
    <div className="flex flex-wrap gap-2 items-center justify-end">
      {themes.map(t => (
        <button
          key={t.id}
          onClick={() => toggleTheme(t.id)}
          title={t.name}
          className={cn(
            "w-8 h-8 rounded-full border border-border transition-all duration-300 flex items-center justify-center shadow-md hover:scale-110",
            t.color,
            theme === t.id ? "border-foreground scale-110 ring-2" : "opacity-80 hover:opacity-100"
          )}
        >
          {theme === t.id && <Check size={14} className="text-foreground drop-shadow-md" />}
        </button>
      ))}
    </div>
  )
}

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
  const { user, impersonatedUser } = useAuth()
  const effectiveUserId = impersonatedUser?.id || user?.id;
  const [activeTab, setActiveTab] = useState("studio")
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [workingHours, setWorkingHours] = useState<WorkingHours>(defaultWorkingHours)
  const [vacationMode, setVacationMode] = useState<VacationMode>(defaultVacationMode)
  const [telegramConfig, setTelegramConfig] = useState<TelegramSettings>(defaultTelegramSettings)
  const [techniques, setTechniques] = useState<string[]>(defaultTechniques)
  const [customMessages, setCustomMessages] = useState<CustomMessages>(defaultCustomMessages)
  const [newTechnique, setNewTechnique] = useState("")
  const [testingToken, setTestingToken] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  
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
      const data = await getRecipients(effectiveUserId)
      const persons = data.filter(r => 
        !['SYSTEM_TOKEN', 'SUMMARY_STATE', 'MAIN_API_URL', 'WEBHOOK_STATE', 'WORKING_HOURS', 'VACATION_MODE', 'TELEGRAM_CONFIG', 'TECHNIQUES', 'PERFIL', 'PERFIL_EXTRAS', 'CUSTOM_MESSAGES'].includes(r.nome)
      )
      setRecipients(persons.slice(0, 3))
      
      // O token agora é global e não deve ser exposto ao cliente
      // const token = await getTelegramToken()
      // if (token) setBotToken(token)

      const wh = await getWorkingHours(effectiveUserId)
      setWorkingHours(wh)
      
      const vm = await getVacationMode(effectiveUserId)
      setVacationMode(vm)
      
      const tc = await getTelegramConfig(effectiveUserId)
      setTelegramConfig(tc)

      const tks = await getTechniques(effectiveUserId)
      setTechniques(tks)

      const msgs = await getCustomMessages(effectiveUserId)
      setCustomMessages(msgs)

      const p = await getProfile(effectiveUserId)
      if (p) setPerfil(p as Perfil)

      
    } catch (error) {
      console.error("Erro ao carregar configurações", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddRecipient = () => {
    if (recipients.length >= 5) return
    setRecipients([...recipients, { id: 'temp-' + Date.now(), nome: "", chatID: "" }])
  }

  const handleRemoveRecipient = (index: number) => {
    const newRecipients = [...recipients]
    newRecipients.splice(index, 1)
    setRecipients(newRecipients)
  }

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2097152) {
      toast({ variant: "destructive", title: "Erro ao enviar", description: "A imagem deve ter no máximo 2MB" })
      return
    }

    setUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', perfil.id!)

      const res = await fetch('/api/upload/logo', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Houve um erro no upload")
      }

      const { url } = await res.json()
      setPerfil(prev => ({ ...prev, logo_url: url }))
      toast({ title: "Sucesso", description: "Sua foto foi carregada com sucesso! Clique em Salvar Configurações no final da tela para mantê-la." })
    } catch (error: any) {
      console.error("Erro no upload:", error)
      toast({ variant: "destructive", title: "Erro", description: error.message })
    } finally {
      setUploadingLogo(false)
      if (e.target) e.target.value = ''
    }
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
        const data = await res.json()
        toast({ 
          title: "Teste Enviado!", 
          description: `Enviado para ${data.count} ref(s) via robô @${data.botName}. Confira seu Telegram! Se não chegou, verifique se seu Chat ID numérico está correto e se está olhando o robô certo.` 
        })
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
      await updateWorkingHours(workingHours, effectiveUserId);
      await updateVacationMode(vacationMode, effectiveUserId);
      await updateTelegramConfig(telegramConfig, effectiveUserId);
      await updateTechniques(techniques, effectiveUserId);
      await updateCustomMessages(customMessages, effectiveUserId);

      const remoteRecipients = await getRecipients(effectiveUserId)
      for (const remote of remoteRecipients) {
        const isSystemKey = [
          'SYSTEM_TOKEN', 'SUMMARY_STATE', 'MAIN_API_URL', 'WEBHOOK_STATE', 
          'WORKING_HOURS', 'VACATION_MODE', 'TELEGRAM_CONFIG', 'TECHNIQUES', 'PERFIL', 'PERFIL_EXTRAS', 'CUSTOM_MESSAGES'
        ].includes(remote.nome);
        if (!isSystemKey && !recipients.find(r => r.id === remote.id)) {
          await deleteRecipient(remote.id)
        }
      }
      for (const local of recipients) {
        if (local.id.startsWith('temp-')) {
          await createRecipient({ nome: local.nome, chatID: local.chatID }, effectiveUserId)
        } else {
          await updateRecipient(local)
        }
      }

      const p = perfil as Perfil;
      if (p.nome_exibicao || p.slug || theme) {
        await updateProfile({ ...p, theme }, effectiveUserId);
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-5 bg-muted/50 p-1 rounded-2xl mb-8 overflow-x-auto">
            <TabsTrigger value="studio" className="rounded-xl gap-1 md:gap-2 h-10 px-2"><Crown size={16} /> <span className="hidden md:inline">Studio</span></TabsTrigger>
            <TabsTrigger value="agenda" className="rounded-xl gap-1 md:gap-2 h-10 px-2"><Calendar size={16} /> <span className="hidden md:inline">Agenda</span></TabsTrigger>
            <TabsTrigger value="robo" className="rounded-xl gap-1 md:gap-2 h-10 px-2"><Bot size={16} /> <span className="hidden md:inline">Robô</span></TabsTrigger>
            <TabsTrigger value="mensagens" className="rounded-xl gap-1 md:gap-2 h-10 px-2"><MessageCircle size={16} /> <span className="hidden md:inline">Mensagens</span></TabsTrigger>
            <TabsTrigger value="estilo" className="rounded-xl gap-1 md:gap-2 h-10 px-2"><Sparkles size={16} /> <span className="hidden md:inline">Estilo</span></TabsTrigger>
          </TabsList>

          <TabsContent value="studio" className="space-y-6 outline-none animate-in fade-in zoom-in-95 fill-mode-both duration-300">
            <div className="space-y-4">
              <Label className="text-sm font-bold uppercase tracking-widest text-primary/60">Identidade</Label>
              <div className="bg-muted/30 p-4 rounded-2xl border border-border space-y-4">
                
                <div className="flex gap-4 items-center mb-4">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-primary/20 flex-shrink-0 bg-background flex items-center justify-center">
                    {uploadingLogo ? (
                      <Loader2 className="animate-spin text-primary" size={20} />
                    ) : perfil.logo_url ? (
                      <img src={perfil.logo_url} alt="Logo" className="w-full h-full object-cover" />
                    ) : perfil.avatar_url ? (
                      <img src={perfil.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <Crown className="text-primary/50" size={24} />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-[10px] font-bold uppercase">Sua Logo / Foto (Máx 2MB)</Label>
                    <div className="text-xs text-muted-foreground">O sistema usará a foto do Google automaticamente caso vazio.</div>
                    <div className="relative mt-2">
                      <Button variant="outline" size="sm" className="h-8 text-xs relative" disabled={uploadingLogo}>
                        {uploadingLogo ? 'Enviando...' : 'Fazer Upload (JPG/PNG)'}
                        <input type="file" accept="image/jpeg, image/png" className="absolute inset-0 opacity-0 cursor-pointer" disabled={uploadingLogo} onChange={handleUploadLogo} />
                      </Button>
                      {perfil.logo_url && (
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive ml-2" onClick={() => setPerfil({...perfil, logo_url: ''})} disabled={uploadingLogo}>
                          Remover
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase">Nome do Estúdio</Label>
                  <Input value={perfil.nome_exibicao} onChange={(e) => setPerfil({...perfil, nome_exibicao: e.target.value})} className="rounded-xl bg-background" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase">Slug do Link</Label>
                  <Input value={perfil.slug} onChange={(e) => setPerfil({...perfil, slug: e.target.value})} className="rounded-xl bg-background" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-sm font-bold uppercase tracking-widest text-primary/60">Especialidades</Label>
              <div className="bg-muted/30 p-4 rounded-2xl border border-border space-y-4">
                <div className="flex flex-wrap gap-2">
                  {techniques.map((tech, index) => (
                    <div key={index} className="flex items-center gap-2 bg-background border border-border rounded-full px-3 py-1 text-xs font-semibold">
                      {tech}
                      <button onClick={() => setTechniques(techniques.filter((_, i) => i !== index))}><XCircle size={12} /></button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Adicionar técnica..." value={newTechnique} onChange={(e) => setNewTechnique(e.target.value)} className="rounded-xl bg-background h-10" />
                  <Button onClick={() => { if (newTechnique.trim()) { setTechniques([...techniques, newTechnique.trim()]); setNewTechnique("") } }} size="sm" className="rounded-xl px-4">Add</Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="agenda" className="space-y-6 outline-none animate-in fade-in zoom-in-95 fill-mode-both duration-300">
            <div className="bg-muted/30 p-4 rounded-2xl border border-border space-y-6">
              <div className="flex items-center justify-between">
                <Label className="font-bold flex items-center gap-2"><Palmtree size={18} /> Modo Férias</Label>
                <Switch checked={vacationMode.active} onCheckedChange={(c) => setVacationMode({...vacationMode, active: c})} />
              </div>
              {vacationMode.active && (
                <Textarea value={vacationMode.message} onChange={(e) => setVacationMode({...vacationMode, message: e.target.value})} className="rounded-xl bg-background" placeholder="Mensagem de ausência..." />
              )}
              
              <Separator className="bg-border/50" />
              
              <Label className="text-xs font-bold uppercase tracking-widest text-primary/60">Horários de Atendimento</Label>
              <div className="grid grid-cols-1 gap-2">
                {['seg','ter','qua','qui','sex','sab','dom'].map(k => {
                  const day = k as keyof WorkingHours;
                  return (
                    <div key={k} className="flex items-center justify-between text-xs p-2 bg-background/50 rounded-lg">
                      <div className="flex items-center gap-2 w-20">
                        <Switch checked={workingHours[day].active} onCheckedChange={(c) => setWorkingHours({...workingHours, [day]: {...workingHours[day], active: c}})} />
                        <span className="font-bold uppercase opacity-60">{k}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input type="time" value={workingHours[day].start} onChange={(e) => setWorkingHours({...workingHours, [day]: {...workingHours[day], start: e.target.value}})} disabled={!workingHours[day].active} className="h-7 w-20 text-[10px] rounded-md" />
                        <span>-</span>
                        <Input type="time" value={workingHours[day].end} onChange={(e) => setWorkingHours({...workingHours, [day]: {...workingHours[day], end: e.target.value}})} disabled={!workingHours[day].active} className="h-7 w-20 text-[10px] rounded-md" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="robo" className="space-y-6 outline-none animate-in fade-in zoom-in-95 fill-mode-both duration-300">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold uppercase tracking-widest text-primary/60">Destinatários Telegram (Bot: <a href="https://t.me/ilashnotificationbot" target="_blank" className="underline hover:text-primary transition-colors">@ilashnotificationbot</a>)</Label>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleTestToken} disabled={testingToken || recipients.every(r => !r.chatID?.trim())} className="h-8 rounded-full text-[10px]">
                    {testingToken ? <Loader2 className="animate-spin mr-1" size={12} /> : null}
                    {testingToken ? 'Enviando...' : 'Testar'}
                  </Button>
                  <Button size="sm" onClick={handleAddRecipient} disabled={recipients.length >= 5} className="h-8 rounded-full text-[10px]">Add</Button>
                </div>
              </div>
              <div className="space-y-2">
                {recipients.map((r, i) => (
                  <div key={r.id} className="flex gap-2 bg-muted/30 p-2 rounded-xl items-center">
                    <Input placeholder="Nome" value={r.nome} onChange={(e) => handleUpdateRecipientField(i, 'nome', e.target.value)} className="h-8 text-[10px] bg-background" />
                    <Input placeholder="Chat ID" value={r.chatID} onChange={(e) => handleUpdateRecipientField(i, 'chatID', e.target.value)} className="h-8 text-[10px] bg-background" />
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveRecipient(i)} className="h-8 w-8 text-destructive"><Trash2 size={14} /></Button>
                  </div>
                ))}
              </div>
            </div>

          </TabsContent>

          <TabsContent value="mensagens" className="space-y-6 outline-none animate-in fade-in zoom-in-95 fill-mode-both duration-300">
            <div className="space-y-6">
              <div className="bg-muted/30 p-4 rounded-2xl border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="font-bold flex items-center gap-2"><Send size={18} className="text-green-500" /> WhatsApp (Lembrete Personalizado)</Label>
                  <Button variant="ghost" size="sm" onClick={() => setCustomMessages({...customMessages, whatsappReminder: defaultCustomMessages.whatsappReminder})} className="text-[10px] h-6 px-2 text-primary/60 hover:text-primary"><RefreshCw size={12} className="mr-1" /> Restaurar Padrão</Button>
                </div>
                <p className="text-[10px] text-muted-foreground flex flex-wrap gap-1 leading-relaxed">Variáveis: <span className="font-mono bg-background px-1 rounded">{"{{cliente}}"}</span> <span className="font-mono bg-background px-1 rounded">{"{{tipo}}"}</span> <span className="font-mono bg-background px-1 rounded">{"{{dia_semana}}"}</span> <span className="font-mono bg-background px-1 rounded">{"{{data}}"}</span> <span className="font-mono bg-background px-1 rounded">{"{{hora}}"}</span> <span className="font-mono bg-background px-1 rounded">{"{{tecnica}}"}</span> <span className="font-mono bg-background px-1 rounded">{"{{valor_base}}"}</span> <span className="font-mono bg-background px-1 rounded">{"{{valor_total}}"}</span> <span className="font-mono bg-background px-1 rounded">{"{{adicionais}}"}</span> <span className="font-mono bg-background px-1 rounded">{"{{link_anamnese}}"}</span></p>
                <Textarea 
                  value={customMessages.whatsappReminder} 
                  onChange={(e) => setCustomMessages({...customMessages, whatsappReminder: e.target.value})} 
                  className="rounded-xl bg-background min-h-[150px] font-mono text-[10px] md:text-xs" 
                />
              </div>

              <div className="bg-muted/30 p-4 rounded-2xl border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="font-bold flex items-center gap-2"><Bot size={18} className="text-blue-500" /> Telegram (Lembretes Automáticos)</Label>
                  <Button variant="ghost" size="sm" onClick={() => setCustomMessages({...customMessages, telegramReminder: defaultCustomMessages.telegramReminder})} className="text-[10px] h-6 px-2 text-primary/60 hover:text-primary"><RefreshCw size={12} className="mr-1" /> Restaurar Padrão</Button>
                </div>
                <p className="text-[10px] text-muted-foreground flex flex-wrap gap-1 leading-relaxed">Variáveis: <span className="font-mono bg-background px-1 rounded">{"{{cliente}}"}</span> <span className="font-mono bg-background px-1 rounded">{"{{hora}}"}</span></p>
                <Textarea 
                  value={customMessages.telegramReminder} 
                  onChange={(e) => setCustomMessages({...customMessages, telegramReminder: e.target.value})} 
                  className="rounded-xl bg-background min-h-[80px] font-mono text-[10px] md:text-xs" 
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="estilo" className="space-y-6 outline-none animate-in fade-in zoom-in-95 fill-mode-both duration-300">
            <div className="space-y-4">
              <Label className="text-sm font-bold uppercase tracking-widest text-primary/60">Tema do Sistema</Label>
              <div className="bg-muted/30 p-4 rounded-2xl border border-border flex items-center justify-between">
                <span className="text-sm font-semibold">Paleta de Cores</span>
                <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
              </div>
            </div>

          </TabsContent>
        </Tabs>

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

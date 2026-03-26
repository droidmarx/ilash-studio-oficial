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
  updateTelegramToken, setTelegramWebhook, DEFAULT_API_URL, 
  getWebhookStatus, updateWebhookStatus, getTelegramToken,
  getWorkingHours, updateWorkingHours, WorkingHours, WorkingDay, defaultWorkingHours,
  getVacationMode, updateVacationMode, VacationMode, defaultVacationMode,
  getTelegramConfig, updateTelegramConfig, TelegramSettings, defaultTelegramSettings,
  getTechniques, updateTechniques, defaultTechniques,
  getProfile, updateProfile, checkSlugAvailability, Perfil
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
  const [botToken, setBotToken] = useState("")
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [isWebhookActive, setIsWebhookActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [webhookLoading, setWebhookLoading] = useState(false)
  const [workingHours, setWorkingHours] = useState<WorkingHours>(defaultWorkingHours)
  const [vacationMode, setVacationMode] = useState<VacationMode>(defaultVacationMode)
  const [telegramConfig, setTelegramConfig] = useState<TelegramSettings>(defaultTelegramSettings)
  const [techniques, setTechniques] = useState<string[]>(defaultTechniques)
  const [newTechnique, setNewTechnique] = useState("")
  const [testingToken, setTestingToken] = useState(false)
  
  const [perfil, setPerfil] = useState<Partial<Perfil>>({ nome_exibicao: "", slug: "" })
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  
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
      
      // O botToken agora é global, buscamos apenas para compatibilidade visual se necessário, 
      // mas não permitiremos edição individual.
      const token = await getTelegramToken()
      if (token) setBotToken(token)

      const status = await getWebhookStatus()
      setIsWebhookActive(status)

      const wh = await getWorkingHours()
      setWorkingHours(wh)
      
      const vm = await getVacationMode()
      setVacationMode(vm)
      
      const tc = await getTelegramConfig()
      setTelegramConfig(tc)

      const tks = await getTechniques()
      setTechniques(tks)

      const p = await getProfile()
      if (p) {
        setPerfil(p as Perfil)
      }
      
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

  const handleToggleWebhook = async () => {
    if (!botToken) {
      toast({ variant: "destructive", title: "Erro", description: "Salve o Token do Bot antes de alterar o modo interativo." })
      return
    }
    setWebhookLoading(true)
    try {
      const currentUrl = window.location.origin
      const targetUrl = isWebhookActive ? "" : currentUrl
      const success = await setTelegramWebhook(botToken.trim(), targetUrl)
      
      if (success) {
        const nextState = !isWebhookActive
        await updateWebhookStatus(nextState)
        setIsWebhookActive(nextState)
        toast({ 
          title: nextState ? "Bot Ativado!" : "Bot Desativado", 
          description: nextState ? "Agora seu robô responderá aos comandos /command1, /command2, /command3 e /command4." : "O robô não responderá mais a comandos interativos." 
        })
      } else {
        throw new Error()
      }
    } catch (error: any) {
      console.error("Erro ao ativar webhook:", error);
      toast({ 
        variant: "destructive", 
        title: "Falha na Operação", 
        description: error.message || "Verifique seu Token e tente novamente." 
      })
    } finally {
      setWebhookLoading(false)
    }
  }

  const handleTestToken = async () => {
    if (!botToken) {
      toast({ variant: "destructive", title: "Erro", description: "Informe o Token do Bot primeiro." })
      return
    }
    setTestingToken(true)
    try {
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: botToken, userId: perfil.id }),
      })
      if (res.ok) {
        toast({ title: "Sucesso", description: "Mensagem de teste enviada para os administradores." })
      } else {
        throw new Error()
      }
    } catch (error: any) {
      console.error("Erro no teste do Telegram:", error);
      toast({ 
        variant: "destructive", 
        title: "Erro no Teste", 
        description: error.message || "Verifique seu Token e sua lista de destinatários." 
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

      if (botToken) {
        await updateTelegramToken(botToken.trim());
      }

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

      if (perfil.nome_exibicao || perfil.slug) {
        await updateProfile(perfil as Perfil);
      }

      toast({ title: "Configurações Salvas", description: "Configurações sincronizadas com sucesso." })
      onSave()
      onClose()
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast({ 
        variant: "destructive", 
        title: "Erro ao Salvar", 
        description: error.message || "Falha ao sincronizar dados. Verifique se o bucket 'logos' foi criado no Supabase." 
      })
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
          <div className="space-y-4">
            <Label className="text-lg font-bold flex items-center gap-2 text-primary">
              <Crown size={20} />
              Identidade do Studio
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

          <div className="space-y-4">
            <Label className="text-lg font-bold flex items-center gap-2 text-primary">
              <Sparkles size={20} />
              Aparência do Sistema
            </Label>
            <div className="flex items-center justify-between bg-muted/30 p-4 rounded-2xl border border-border">
              <div className="space-y-0.5">
                <p className="text-sm font-bold">Modo de Exibição</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Alternar entre tema claro e escuro</p>
              </div>
              <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            </div>
          </div>

          <Separator className="bg-primary/10" />

          {/* Configuração de Técnicas */}
          <div className="space-y-6">
            <Label className="text-lg font-bold flex items-center gap-2 text-primary">
              <Sparkles size={20} />
              Modelos de Técnicas Oferecidas
            </Label>
            
            <div className="bg-muted/30 p-4 rounded-2xl border border-border space-y-4">
              <div className="flex flex-wrap gap-2">
                {techniques.map((tech, index) => (
                  <div key={index} className="flex items-center gap-2 bg-background border border-border shadow-sm rounded-full px-3 py-1.5 text-sm font-semibold animate-in zoom-in duration-300">
                    <span>{tech}</span>
                    <button 
                      onClick={() => setTechniques(techniques.filter((_, i) => i !== index))}
                      className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                    >
                      <XCircle size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 h-12 mt-2">
                <Input 
                  placeholder="Nova técnica (Ex: Híbrido, Russo Volume...)" 
                  value={newTechnique}
                  onChange={(e) => setNewTechnique(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newTechnique.trim()) {
                      e.preventDefault();
                      if (!techniques.includes(newTechnique.trim())) {
                        setTechniques([...techniques, newTechnique.trim()]);
                      }
                      setNewTechnique("");
                    }
                  }}
                  className="h-full rounded-xl bg-background border-border text-sm flex-1 focus:ring-primary/20"
                />
                <Button 
                  onClick={() => {
                    if (newTechnique.trim() && !techniques.includes(newTechnique.trim())) {
                      setTechniques([...techniques, newTechnique.trim()]);
                      setNewTechnique("");
                    }
                  }}
                  disabled={!newTechnique.trim()}
                  className="h-full rounded-xl px-4 gap-2 bg-primary text-primary-foreground font-bold"
                >
                  <PlusCircle size={16} /> Adicionar
                </Button>
              </div>
            </div>
          </div>


          <Separator className="bg-primary/10" />

          {/* Agenda & Férias */}
          <div className="space-y-6">
            <Label className="text-lg font-bold flex items-center gap-2 text-primary">
              <Calendar size={20} />
              Configuração de Agenda e Férias
            </Label>
            
            {/* Vacation Mode */}
            <div className="bg-muted/30 p-4 rounded-2xl border border-border space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold flex items-center gap-2">
                    <Palmtree size={16} className="text-primary" /> Modo Férias
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Bloqueia novos agendamentos</p>
                </div>
                <Switch 
                  checked={vacationMode.active} 
                  onCheckedChange={(c) => setVacationMode({...vacationMode, active: c})} 
                />
              </div>
              {vacationMode.active && (
                <div className="space-y-2 pt-2 animate-in fade-in zoom-in">
                  <Label className="text-xs">Mensagem para os clientes</Label>
                  <Textarea 
                    value={vacationMode.message}
                    onChange={(e) => setVacationMode({...vacationMode, message: e.target.value})}
                    placeholder="Ex: Estamos de férias! Retornamos em..."
                    className="resize-none h-20 rounded-xl bg-background border-border"
                  />
                </div>
              )}
            </div>

            {/* Working Hours */}
            <div className="bg-muted/30 p-4 rounded-2xl border border-border space-y-4">
              <div className="space-y-0.5 mb-4">
                <p className="text-sm font-bold flex items-center gap-2">
                  <Clock size={16} className="text-primary" /> Horário de Trabalho
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Dias e horários que você atende</p>
              </div>
              <div className="space-y-3">
                {Object.entries({
                  seg: 'Segunda', ter: 'Terça', qua: 'Quarta', qui: 'Quinta', sex: 'Sexta', sab: 'Sábado', dom: 'Domingo'
                }).map(([key, label]) => {
                  const k = key as keyof WorkingHours;
                  const dayData = workingHours[k];
                  const updateDay = (field: keyof WorkingDay, val: any) => {
                    setWorkingHours({
                      ...workingHours,
                      [k]: { ...dayData, [field]: val }
                    })
                  }
                  return (
                    <div key={key} className="flex flex-wrap sm:flex-nowrap items-center gap-3">
                      <div className="flex items-center gap-2 w-full sm:w-28">
                        <Switch checked={dayData.active} onCheckedChange={(c) => updateDay('active', c)} />
                        <span className="text-xs font-semibold">{label}</span>
                      </div>
                      <Input 
                        type="time" 
                        value={dayData.start}
                        onChange={(e) => updateDay('start', e.target.value)}
                        disabled={!dayData.active}
                        className="h-8 text-xs rounded-lg bg-background w-24" 
                      />
                      <span className="text-muted-foreground text-xs">até</span>
                      <Input 
                        type="time" 
                        value={dayData.end}
                        onChange={(e) => updateDay('end', e.target.value)}
                        disabled={!dayData.active}
                        className="h-8 text-xs rounded-lg bg-background w-24" 
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-bold flex items-center gap-2 text-primary">
                <Bot size={20} />
                Status do Bot Interativo
              </Label>
              <Button 
                variant={isWebhookActive ? "destructive" : "outline"}
                size="sm" 
                onClick={handleToggleWebhook}
                disabled={webhookLoading || !botToken}
                className="rounded-full gap-2 h-8 px-4"
              >
                {webhookLoading ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : isWebhookActive ? (
                  <XCircle size={14} />
                ) : (
                  <Bot size={14} />
                )}
                {isWebhookActive ? "Desativar modo interativo" : "Ativar Bot Interativo"}
              </Button>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-2 gap-2">
              <p className="text-[10px] text-muted-foreground leading-tight max-w-[70%]">
                O bot agora usa um token global. Registre seu <b>Chat ID</b> abaixo para receber notificações.
                Comandos: <b>/command1</b>, <b>/command2</b>, <b>/command3</b>, <b>/command4</b>.
              </p>
              <Button size="sm" variant="outline" onClick={handleTestToken} disabled={testingToken} className="h-8 text-xs rounded-full gap-2 whitespace-nowrap">
                {testingToken ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />} Testar Conexão
              </Button>
            </div>

            {/* Telegram Settings */}
            <div className="bg-muted/30 p-4 rounded-2xl border border-border space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold flex items-center gap-2">
                    <RefreshCw size={16} className="text-primary" /> Resumo Diário
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Envia a agenda do dia às 8h</p>
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
                  <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Lembra da cliente que está chegando</p>
                </div>
                <Switch 
                  checked={telegramConfig.reminder2h} 
                  onCheckedChange={(c) => setTelegramConfig({...telegramConfig, reminder2h: c})} 
                />
              </div>
            </div>
          </div>

          <Separator className="bg-primary/10" />

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-bold flex items-center gap-2 text-primary">
                <Send size={20} />
                Destinatários de Alerta (Máx. 3)
              </Label>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleAddRecipient}
                disabled={recipients.length >= 3 || loading}
                className="text-primary hover:bg-primary/10 gap-2"
              >
                <PlusCircle size={16} /> Adicionar
              </Button>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="animate-spin text-primary" />
                </div>
              ) : recipients.map((r, index) => (
                <div key={r.id} className="bg-muted/30 p-4 rounded-2xl border border-border space-y-3 relative group">
                  <button 
                    onClick={() => handleRemoveRecipient(index)}
                    className="absolute top-2 right-2 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={16} />
                  </button>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <User size={10} /> Nome do Admin
                      </Label>
                      <Input
                        placeholder="Ex: Maria"
                        value={r.nome}
                        onChange={(e) => handleUpdateRecipientField(index, 'nome', e.target.value)}
                        className="rounded-lg h-10 bg-background border-border"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <MessageSquare size={10} /> Chat ID
                      </Label>
                      <Input
                        placeholder="Ex: 5759760387"
                        value={r.chatID}
                        onChange={(e) => handleUpdateRecipientField(index, 'chatID', e.target.value)}
                        className="rounded-lg h-10 bg-background border-border"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-4">
          <Button variant="ghost" onClick={onClose} disabled={saving} className="rounded-xl">Cancelar</Button>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="flex-1 rounded-xl h-12 bg-gold-gradient text-primary-foreground font-bold text-lg hover:scale-[1.02] transition-transform"
          >
            {saving ? <Loader2 className="animate-spin" /> : "Salvar Configurações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

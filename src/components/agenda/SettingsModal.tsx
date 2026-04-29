"use client"
import { useAuth } from "@/hooks/use-auth"

import { useState, useEffect } from "react"
import { Settings, Send, MessageSquare, User, Trash2, PlusCircle, Loader2, Key, Bot, XCircle, Sparkles, Clock, Palmtree, RefreshCw, Calendar, Bell, ShieldCheck, Crown, Check, MessageCircle, Type, MapPin } from "lucide-react"
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

function ChatBubble({ 
  type, 
  content, 
  title, 
  active, 
  onToggle 
}: { 
  type: 'whatsapp' | 'telegram', 
  content: string, 
  title: string, 
  active?: boolean, 
  onToggle?: (val: boolean) => void 
}) {
  const isWhatsapp = type === 'whatsapp'
  
  // Converte formatação básica de markdown/HTML para o preview
  const formatContent = (text: string) => {
    return text
      .split('\n')
      .map((line, i) => (
        <span key={i}>
          {line.split(/(\*.*?\*|<b>.*?<\/b>)/g).map((part, j) => {
            if (part.startsWith('*') && part.endsWith('*')) {
              return <strong key={j}>{part.slice(1, -1)}</strong>
            }
            if (part.startsWith('<b>') && part.endsWith('</b>')) {
              return <strong key={j}>{part.slice(3, -4)}</strong>
            }
            return part
          })}
          <br />
        </span>
      ))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <Label className="text-[11px] font-black uppercase tracking-wider text-primary/70 flex items-center gap-2">
          {isWhatsapp ? <MessageCircle size={14} className="text-green-500" /> : <Bot size={14} className="text-blue-400" />}
          {title}
        </Label>
        {onToggle !== undefined && (
          <Switch checked={active} onCheckedChange={onToggle} />
        )}
      </div>
      
      <div className={cn(
        "relative p-4 rounded-2xl text-[11px] md:text-xs shadow-sm border max-w-[90%] md:max-w-[85%]",
        isWhatsapp 
          ? "bg-[#D9FDD3] border-[#BEE6B2] text-[#111B21] ml-0 rounded-tl-none mr-auto" 
          : "bg-[#EFF6FF] border-[#DBEAFE] text-[#1E293B] ml-auto rounded-tr-none mr-0"
      )}>
        {/* Triângulo lateral da bolha */}
        <div className={cn(
          "absolute top-0 w-3 h-3",
          isWhatsapp 
            ? "left-[-8px] border-t-[8px] border-t-[#D9FDD3] border-l-[8px] border-l-transparent" 
            : "right-[-8px] border-t-[8px] border-t-[#EFF6FF] border-r-[8px] border-r-transparent"
        )} />
        
        <div className="leading-relaxed font-sans whitespace-pre-wrap">
          {formatContent(content)}
        </div>
        
        <div className="mt-1 flex justify-end items-center gap-1 opacity-40 text-[9px]">
          <span>{new Date().getHours()}:{new Date().getMinutes().toString().padStart(2, '0')}</span>
          {isWhatsapp && <Check size={10} className="text-blue-500" />}
        </div>
      </div>
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
          <TabsList className="grid grid-cols-6 bg-muted/50 p-1 rounded-2xl mb-8 overflow-x-auto">
            <TabsTrigger value="studio" className="rounded-xl gap-1 md:gap-2 h-10 px-2"><Crown size={16} /> <span className="hidden md:inline">Studio</span></TabsTrigger>
            <TabsTrigger value="localizacao" className="rounded-xl gap-1 md:gap-2 h-10 px-2"><MapPin size={16} /> <span className="hidden md:inline">Local</span></TabsTrigger>
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

          <TabsContent value="localizacao" className="space-y-6 outline-none animate-in fade-in zoom-in-95 fill-mode-both duration-300">
            <div className="space-y-4">
              <Label className="text-sm font-bold uppercase tracking-widest text-primary/60">Endereço do Estúdio</Label>
              <div className="bg-muted/30 p-4 rounded-2xl border border-border space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                    <MapPin className="text-primary" size={20} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label className="text-[10px] font-bold uppercase">Endereço Completo</Label>
                    <Input
                      value={perfil.studioAddress || ""}
                      onChange={(e) => setPerfil({ ...perfil, studioAddress: e.target.value })}
                      placeholder="Ex: Rua das Flores, 123, São Paulo - SP"
                      className="rounded-xl bg-background"
                    />
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Este endereço será enviado automaticamente via WhatsApp para clientes que estão confirmando o <strong>primeiro agendamento</strong>.
                    </p>
                  </div>
                </div>

                {perfil.studioAddress && perfil.studioAddress.trim() && (
                  <div className="bg-background/60 p-3 rounded-xl border border-border space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-primary/60">Preview do Link</Label>
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(perfil.studioAddress.trim())}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-primary hover:underline break-all"
                    >
                      <MapPin size={12} className="shrink-0" />
                      https://maps.google.com/?q={encodeURIComponent(perfil.studioAddress.trim())}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 space-y-2">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-primary shrink-0" />
                <p className="text-[11px] font-bold text-primary">Como funciona?</p>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Quando você confirmar um agendamento de uma cliente cujo WhatsApp ainda não possui outros agendamentos no sistema (cliente nova), o link do Google Maps será adicionado automaticamente ao final da mensagem de confirmação enviada pelo WhatsApp.
              </p>
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
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-bold uppercase tracking-widest text-primary/60">Configurações de Horário</Label>
                </div>
                <div className="bg-muted/30 p-4 rounded-2xl border border-border flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase">Horário do Resumo Diário</Label>
                    <p className="text-[9px] text-muted-foreground italic">Quando você receberá a agenda do dia</p>
                  </div>
                  <Input 
                    type="time" 
                    value={telegramConfig.summaryTime || "08:00"} 
                    onChange={(e) => setTelegramConfig({...telegramConfig, summaryTime: e.target.value})}
                    className="w-24 h-9 bg-background rounded-xl text-center font-bold"
                  />
                </div>
              </div>
            </div>

          </TabsContent>

          <TabsContent value="mensagens" className="space-y-8 outline-none animate-in fade-in zoom-in-95 fill-mode-both duration-300 py-2">
            <div className="space-y-8">
              {/* Seção WhatsApp */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                  <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                    <MessageCircle className="text-green-500" size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">Lembretes WhatsApp</h4>
                    <p className="text-[10px] text-muted-foreground uppercase font-black opacity-50">Manual via Botão na Agenda</p>
                  </div>
                </div>

                <ChatBubble 
                  type="whatsapp"
                  title="Modelo de Lembrete"
                  content={customMessages.whatsappReminder
                    .replace(/{{cliente}}/g, "Maria Silva")
                    .replace(/{{tipo}}/g, "Aplicação")
                    .replace(/{{dia_semana}}/g, "Segunda-feira")
                    .replace(/{{data}}/g, "24/04")
                    .replace(/{{hora}}/g, "14:00")
                    .replace(/{{tecnica}}/g, "Brasileiro")
                    .replace(/{{valor_base}}/g, "120,00")
                    .replace(/{{valor_total}}/g, "150,00")
                    .replace(/{{adicionais}}/g, " (Cílios Inferiores)")
                    .replace(/{{link_anamnese}}/g, "\n\n📋 Preencha sua ficha aqui: preview.link")
                  }
                />
                
                <div className="bg-primary/5 p-4 rounded-2xl text-[10px] text-muted-foreground italic leading-relaxed">
                  💡 Este conteúdo é enviado manualmente quando você clica no ícone de WhatsApp ao lado de um agendamento.
                </div>
              </div>

              {/* Seção Telegram */}
              <div className="space-y-6 pt-4 border-t border-border/40">
                <div className="flex items-center gap-2 pb-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Bot className="text-blue-500" size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">Automações Telegram</h4>
                    <p className="text-[10px] text-muted-foreground uppercase font-black opacity-50">Notificações Automáticas para Você</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <ChatBubble 
                    type="telegram"
                    title="Sumário Diário (08:00)"
                    active={telegramConfig.dailySummary}
                    onToggle={(v) => setTelegramConfig({...telegramConfig, dailySummary: v})}
                    content={`✨ <b>Bom dia! Agenda de Hoje</b> ✨\n\n✅ (Confirmado)\n⏰ 09:00 - Ana Souza\n🎨 Brasileiro\n\n⏳ (Pendente)\n⏰ 11:30 - Julia Lima\n🎨 Egípcio\n\n🚀 Tenha um ótimo dia de trabalho!`}
                  />

                  <ChatBubble 
                    type="telegram"
                    title="Lembrete Antecipado (2h)"
                    active={telegramConfig.reminder2h}
                    onToggle={(v) => setTelegramConfig({...telegramConfig, reminder2h: v})}
                    content={customMessages.telegramReminder
                      .replace(/{{cliente}}/g, "Fernanda Oliveira")
                      .replace(/{{hora}}/g, "16:30")
                      .replace(/{{servico}}/g, "Manutenção 4D")
                    }
                  />
                </div>
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

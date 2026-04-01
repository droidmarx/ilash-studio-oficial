"use client"

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
  getProfile, updateProfile, Perfil
} from "@/lib/api"

function loadGoogleFont(font: string) {
  if (typeof window === 'undefined') return;
  const id = `google-font-${font.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(id)) return;

  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/\s+/g, '+')}:wght@300;400;500;600;700;800;900&display=swap`;
  document.head.appendChild(link);
}

interface ThemeToggleProps {
  theme: string
  toggleTheme: (theme: string) => void
}

function ThemeToggle({ theme, toggleTheme }: ThemeToggleProps) {
  const themes = [
    { id: 'light', name: 'Rose Gold', color: 'bg-[#f7c5b6]' },
    { id: 'dark', name: 'Studio Escuro', color: 'bg-[#222]' },
    { id: 'ocean', name: 'Oceano Prata', color: 'bg-[#153448] ring-[#8E9EAB]' },
    { id: 'emerald', name: 'Esmeralda', color: 'bg-[#0a311b]' },
    { id: 'amethyst', name: 'Ametista', color: 'bg-[#2a1738]' },
    { id: 'ruby', name: 'Rubi', color: 'bg-[#400e16]' },
  ]

  return (
    <div className="flex flex-wrap gap-2 items-center justify-end">
      {themes.map(t => (
        <button
          key={t.id}
          onClick={() => toggleTheme(t.id)}
          title={t.name}
          className={cn(
            "w-8 h-8 rounded-full border border-white/20 transition-all duration-300 flex items-center justify-center shadow-md hover:scale-110",
            t.color,
            theme === t.id ? "border-foreground scale-110 ring-2 ring-foreground/20" : "opacity-80 hover:opacity-100"
          )}
        >
          {theme === t.id && <Check size={14} className="text-white drop-shadow-md" />}
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
  const [activeTab, setActiveTab] = useState("studio")
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [workingHours, setWorkingHours] = useState<WorkingHours>(defaultWorkingHours)
  const [vacationMode, setVacationMode] = useState<VacationMode>(defaultVacationMode)
  const [telegramConfig, setTelegramConfig] = useState<TelegramSettings>(defaultTelegramSettings)
  const [techniques, setTechniques] = useState<string[]>(defaultTechniques)
  const [newTechnique, setNewTechnique] = useState("")
  const [testingToken, setTestingToken] = useState(false)
  const [fontFamily, setFontFamily] = useState("Poppins")
  
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

      const { data: configs } = await (supabase as any).from('configuracoes').select('nome, valor').eq('nome', 'FONT_FAMILY').maybeSingle()
      if (configs?.valor) {
        setFontFamily(configs.valor)
        loadGoogleFont(configs.valor)
      }
      
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

      await (supabase as any).from('configuracoes').upsert({ user_id: p.id, nome: 'FONT_FAMILY', valor: fontFamily }, { onConflict: 'user_id, nome' })

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
          <TabsList className="grid grid-cols-4 bg-muted/50 p-1 rounded-2xl mb-8">
            <TabsTrigger value="studio" className="rounded-xl gap-2 h-10"><Crown size={16} /> <span className="hidden md:inline">Studio</span></TabsTrigger>
            <TabsTrigger value="agenda" className="rounded-xl gap-2 h-10"><Calendar size={16} /> <span className="hidden md:inline">Agenda</span></TabsTrigger>
            <TabsTrigger value="robo" className="rounded-xl gap-2 h-10"><Bot size={16} /> <span className="hidden md:inline">Robô</span></TabsTrigger>
            <TabsTrigger value="estilo" className="rounded-xl gap-2 h-10"><Sparkles size={16} /> <span className="hidden md:inline">Estilo</span></TabsTrigger>
          </TabsList>

          <TabsContent value="studio" className="space-y-6 outline-none">
            <div className="space-y-4">
              <Label className="text-sm font-bold uppercase tracking-widest text-primary/60">Identidade</Label>
              <div className="bg-muted/30 p-4 rounded-2xl border border-border space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase">Nome do Estúdio</Label>
                  <Input value={perfil.nome_exibicao} onChange={(e) => setPerfil({...perfil, nome_exibicao: e.target.value})} className="rounded-xl bg-background" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase">Slug do Link</Label>
                  <Input value={perfil.slug} onChange={(e) => setPerfil({...perfil, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})} className="rounded-xl bg-background" />
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

          <TabsContent value="agenda" className="space-y-6 outline-none">
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

          <TabsContent value="robo" className="space-y-6 outline-none">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold uppercase tracking-widest text-primary/60">Destinatários Telegram (Bot: @ilashnotificationbot)</Label>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleTestToken} disabled={testingToken} className="h-8 rounded-full text-[10px]">Testar</Button>
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

          <TabsContent value="estilo" className="space-y-6 outline-none">
            <div className="space-y-4">
              <Label className="text-sm font-bold uppercase tracking-widest text-primary/60">Tema do Sistema</Label>
              <div className="bg-muted/30 p-4 rounded-2xl border border-border flex items-center justify-between">
                <span className="text-sm font-semibold">Paleta de Cores</span>
                <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-sm font-bold uppercase tracking-widest text-primary/60">Tipografia Global</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  "Poppins", "Playfair Display", "Lora", "Montserrat", "Raleway", 
                  "Roboto", "Open Sans", "Oswald", "Inter", "Cinzel"
                ].map(font => (
                  <Button 
                    key={font}
                    variant={fontFamily === font ? "default" : "outline"}
                    onClick={() => {
                      setFontFamily(font);
                      loadGoogleFont(font);
                      document.documentElement.style.setProperty('--font-family', font);
                    }}
                    className={cn("rounded-xl h-12 text-sm justify-start gap-3", fontFamily === font && "bg-gold-gradient")}
                    style={{ fontFamily: font }}
                  >
                    <Type size={16} /> {font}
                  </Button>
                ))}
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

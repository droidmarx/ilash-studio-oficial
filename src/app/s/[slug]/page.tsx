"use client"

import { useState, useRef, useEffect, use } from "react"
import { 
  createClient, 
  getWorkingHours, 
  getVacationMode, 
  getTechniques, 
  getProfileBySlug,
  WorkingHours, 
  VacationMode, 
  defaultTechniques,
  Perfil
} from "@/lib/api"
import { notifyAppointmentChange } from "@/app/actions/notifications"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Crown, 
  User, 
  Phone, 
  Calendar as CalendarIcon, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Camera,
  PenLine,
  Eraser,
  HeartPulse,
  MessageCircle,
  AlertCircle,
  Zap,
  RotateCw,
  Trash2,
  Palmtree
} from "lucide-react"
import { format, addDays, eachDayOfInterval, startOfToday } from "date-fns"
import { ptBR } from "date-fns/locale"
import Image from "next/image"

export default function DynamicBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [perfilLoading, setPerfilLoading] = useState(true)

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    nome: "",
    whatsapp: "",
    servico: "",
    tipo: "Aplicação",
    data: "",
    hora: "",
    anamnese: {
      cpf: "",
      rg: "",
      profissao: "",
      dataNascimento: "",
      procedimentoRecenteOlhos: false,
      alergiaCosmeticos: false,
      problemaTireoide: false,
      problemaOcular: false,
      tratamentoOncologico: false,
      gestanteLactante: false,
      dormeDeLado: 'Não' as 'Não' | 'Sim, Lado Direito' | 'Sim, Lado Esquerdo' | 'Sim, Ambos os lados',
      observacoesGerais: "",
      autorizaImagem: true,
      assinatura: ""
    }
  })

  const [configLoading, setConfigLoading] = useState(true)
  const [workingHours, setWorkingHours] = useState<WorkingHours | null>(null)
  const [vacationMode, setVacationMode] = useState<VacationMode | null>(null)
  const [techniques, setTechniques] = useState<string[]>(defaultTechniques)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  
  useEffect(() => {
    async function fetchPerfil() {
      const p = await getProfileBySlug(slug)
      setPerfil(p)
      setPerfilLoading(false)
    }
    fetchPerfil()
  }, [slug])

  useEffect(() => {
    if (!perfil) return
    async function fetchConfig() {
      try {
        const [wh, vm, tks] = await Promise.all([
          getWorkingHours(perfil.id),
          getVacationMode(perfil.id),
          getTechniques(perfil.id)
        ])
        setWorkingHours(wh);
        setVacationMode(vm);
        setTechniques(tks);
      } catch (e) {
        console.error("Erro ao carregar configurações", e);
      } finally {
        setConfigLoading(false);
      }
    }
    fetchConfig();
  }, [perfil])
  
  const days = eachDayOfInterval({
    start: addDays(startOfToday(), 1),
    end: addDays(startOfToday(), 30)
  }).filter((day) => {
    if (!workingHours) return true;
    const dowMap = [ 'dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab' ];
    const dow = dowMap[day.getDay()];
    const wh = workingHours[dow as keyof WorkingHours];
    return wh && wh.active;
  })

  const getAvailableTimes = (targetDayStr: string) => {
    if (!workingHours) return [];
    try {
      const [year, month, day] = targetDayStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const dowMap = [ 'dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab' ];
      const dow = dowMap[date.getDay()];
      const wh = workingHours[dow as keyof WorkingHours];
      if (!wh || !wh.active) return [];
      const startParts = wh.start.split(':').map(Number);
      const endParts = wh.end.split(':').map(Number);
      let startMins = startParts[0] * 60 + startParts[1];
      let endMins = endParts[0] * 60 + endParts[1];
      const availableTimes = [];
      for (let m = startMins; m + 90 <= endMins; m += 90) {
        const hh = Math.floor(m / 60).toString().padStart(2, '0');
        const mm = (m % 60).toString().padStart(2, '0');
        availableTimes.push(`${hh}:${mm}`);
      }
      return availableTimes;
    } catch { return []; }
  }

  const times = formData.data ? getAvailableTimes(formData.data) : [];

  const handleNext = () => setStep(prev => prev + 1)
  const handlePrev = () => setStep(prev => prev - 1)

  // Handlers Ficha Anamnese
  const handleCpfChange = (val: string) => {
    let v = val.replace(/\D/g, "").substring(0, 11)
    if (v.length > 9) v = v.substring(0, 3) + "." + v.substring(3, 6) + "." + v.substring(6, 9) + "-" + v.substring(9)
    else if (v.length > 6) v = v.substring(0, 3) + "." + v.substring(3, 6) + "." + v.substring(6)
    else if (v.length > 3) v = v.substring(0, 3) + "." + v.substring(3)
    setFormData({ ...formData, anamnese: { ...formData.anamnese, cpf: v } })
  }

  const handleRgChange = (val: string) => {
    let v = val.replace(/\D/g, "").substring(0, 9)
    if (v.length > 8) v = v.substring(0, 2) + "." + v.substring(2, 5) + "." + v.substring(5, 8) + "-" + v.substring(8)
    else if (v.length > 5) v = v.substring(0, 2) + "." + v.substring(2, 5) + "." + v.substring(5)
    else if (v.length > 2) v = v.substring(0, 2) + "." + v.substring(2)
    setFormData({ ...formData, anamnese: { ...formData.anamnese, rg: v } })
  }

  const handleBirthDateChange = (val: string) => {
    let v = val.replace(/\D/g, "").substring(0, 8)
    if (v.length > 4) v = v.substring(0, 2) + "/" + v.substring(2, 4) + "/" + v.substring(4)
    else if (v.length > 2) v = v.substring(0, 2) + "/" + v.substring(2)
    setFormData({ ...formData, anamnese: { ...formData.anamnese, dataNascimento: v } })
  }

  // Assinatura Canvas
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    let clientX, clientY
    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = (e as React.MouseEvent).clientX
      clientY = (e as React.MouseEvent).clientY
    }
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    if (canvasRef.current) {
      setFormData(prev => ({ ...prev, anamnese: { ...prev.anamnese, assinatura: canvasRef.current!.toDataURL() } }))
    }
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return
    if ('touches' in e) e.preventDefault()
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return
    const { x, y } = getCoordinates(e)
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#b76e79'
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const clearSignature = (e: React.MouseEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.beginPath()
      }
      setFormData(prev => ({ ...prev, anamnese: { ...prev.anamnese, assinatura: "" } }))
    }
  }

  const handleSubmit = async () => {
    if (!perfil) return
    setLoading(true)
    try {
      const dateTime = `${formData.data}T${formData.hora}`
      const payload = {
        nome: formData.nome,
        whatsapp: formData.whatsapp,
        servico: formData.servico,
        tipo: formData.tipo,
        data: dateTime,
        observacoes: `Agendamento via link: ${perfil.slug}`,
        confirmado: false,
        aniversario: formData.anamnese.dataNascimento,
        anamnese: formData.anamnese
      };
      const newClient = await createClient(payload, perfil.id)
      await notifyAppointmentChange(newClient, 'Novo', perfil.id)
      setSuccess(true)
    } catch (error) {
      console.error("Erro ao agendar", error)
    } finally {
      setLoading(false)
    }
  }

  if (perfilLoading || configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center bg-background/50 backdrop-blur-[2px]">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    )
  }

  if (!perfil) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background/50 backdrop-blur-[2px]">
        <div className="bg-card/60 backdrop-blur-3xl p-10 rounded-[3rem] border border-primary/30 shadow-2xl space-y-4 max-w-md w-full animate-in zoom-in duration-500">
          <AlertTriangle className="text-primary mx-auto" size={64} />
          <h1 className="text-3xl font-headline text-gold-gradient">Estúdio não encontrado</h1>
          <p className="text-muted-foreground italic">O link que você acessou parece estar incorreto ou o estúdio não existe.</p>
          <Button onClick={() => window.location.href = '/'} className="mt-4 rounded-full px-8">Início</Button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background/50 backdrop-blur-md">
        <div className="bg-card/60 backdrop-blur-3xl p-10 rounded-[3rem] border border-primary/30 shadow-2xl space-y-8 max-w-md w-full animate-in zoom-in duration-500">
          <div className="flex justify-center"><CheckCircle2 className="text-green-500" size={64} /></div>
          <div className="space-y-2">
            <h1 className="text-4xl font-headline text-gold-gradient">Enviado!</h1>
            <p className="text-muted-foreground">Obrigada, {formData.nome.split(' ')[0]}! O estúdio <strong>{perfil.nome_exibicao}</strong> recebeu seu pedido.</p>
          </div>
          <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
            <p className="text-xs text-primary/60 font-bold uppercase tracking-widest mb-1">Horário</p>
            <p className="text-lg font-black">{formData.data ? format(new Date(formData.data + 'T00:00:00'), "dd 'de' MMMM", { locale: ptBR }) : ''} às {formData.hora}</p>
          </div>
          <div className="bg-primary/10 p-6 rounded-[20px]">
            <p className="text-sm font-bold text-foreground leading-relaxed">Fique atenta! Entraremos em contato via <strong>WhatsApp</strong> para a confirmação.</p>
          </div>
          <Crown className="text-primary mx-auto opacity-40" size={32} />
        </div>
      </div>
    )
  }

  if (vacationMode?.active) {
    return (
      <div className="min-h-screen py-10 px-4 md:px-8 bg-background/50 backdrop-blur-[2px] flex items-center justify-center">
         <Card className="bg-card/60 backdrop-blur-3xl rounded-[2.5rem] border border-primary/30 shadow-2xl overflow-hidden max-w-lg w-full text-center p-10 space-y-8 animate-in zoom-in duration-500">
           <Palmtree className="text-primary mx-auto animate-bounce" size={64} />
           <h1 className="text-4xl font-headline text-gold-gradient">{perfil.nome_exibicao} em Férias</h1>
           <p className="text-lg text-muted-foreground whitespace-pre-line">{vacationMode.message}</p>
         </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-10 px-4 md:px-8 bg-background/50 backdrop-blur-[2px]">
      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <header className="text-center space-y-4 pt-20 pb-8">
          <div className="flex flex-col items-center justify-center gap-4 animate-float-luxury">
            {perfil.logo_url ? (
              <div className="relative w-48 h-24 mb-4">
                <Image 
                  src={perfil.logo_url} 
                  alt={perfil.nome_exibicao} 
                  fill 
                  className="object-contain"
                  unoptimized
                />
              </div>
            ) : (
              <Crown className="text-primary mx-auto" size={40} />
            )}
            <h1 className="text-6xl font-headline text-gold-gradient py-2 italic">{perfil.nome_exibicao}</h1>
          </div>
          <p className="text-primary/70 text-[10px] font-bold tracking-[0.5em] uppercase">Agendamento Online</p>
        </header>

        <Card className="bg-card/60 backdrop-blur-3xl rounded-[2.5rem] border-border shadow-2xl overflow-hidden">
          <CardContent className="p-8 space-y-8">
            {step === 1 && (
              <div className="space-y-8 animate-in slide-in-from-right duration-500 max-w-md mx-auto">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-primary ml-1">Seu Nome Completo</Label>
                    <Input value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="h-14 rounded-2xl bg-muted/30 border-primary/10 text-lg" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-primary ml-1">WhatsApp (com DDD)</Label>
                    <Input value={formData.whatsapp} onChange={(e) => setFormData({...formData, whatsapp: e.target.value.replace(/\D/g, '')})} className="h-14 rounded-2xl bg-muted/30 border-primary/10 text-lg" />
                  </div>
                </div>
                <Button disabled={!formData.nome.trim() || formData.whatsapp.length < 10} onClick={handleNext} className="w-full h-16 rounded-3xl bg-gold-gradient font-black text-xl gap-2 shadow-xl">Próximo <ArrowRight size={20} /></Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8 animate-in slide-in-from-right duration-500 max-w-md mx-auto">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-primary ml-1 text-center block">O que vamos fazer hoje?</Label>
                <div className="grid grid-cols-1 gap-4">
                  {[{ id: 'Aplicação', icon: <Zap /> }, { id: 'Manutenção', icon: <RotateCw /> }, { id: 'Remoção', icon: <Trash2 /> }].map((item) => (
                    <button key={item.id} onClick={() => setFormData({...formData, tipo: item.id})} className={`p-5 rounded-2xl border flex items-center justify-between ${formData.tipo === item.id ? "bg-primary/10 border-primary" : "bg-muted/20 border-border"}`}>
                      <div className="flex items-center gap-3"><div className="p-2 bg-primary/10 rounded-full text-primary">{item.icon}</div><span className="font-bold">{item.id}</span></div>
                      {formData.tipo === item.id && <CheckCircle2 size={20} className="text-primary" />}
                    </button>
                  ))}
                </div>
                <div className="flex gap-4">
                  <Button variant="ghost" onClick={handlePrev} className="h-14 rounded-3xl flex-1">Voltar</Button>
                  <Button onClick={handleNext} className="h-14 rounded-3xl bg-gold-gradient text-primary-foreground font-black text-lg flex-1 shadow-xl">Próximo</Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-in slide-in-from-right duration-500 max-w-md mx-auto">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-primary ml-1 text-center block">Escolha a Técnica</Label>
                <div className="grid grid-cols-1 gap-3">
                  {techniques.map((tech) => (
                    <button key={tech} onClick={() => setFormData({...formData, servico: tech})} className={`h-16 px-6 rounded-2xl border flex items-center justify-between ${formData.servico === tech ? "bg-primary/10 border-primary" : "bg-muted/20 border-border"}`}>
                      <span className="font-bold">{tech}</span>
                      {formData.servico === tech && <CheckCircle2 size={18} className="text-primary" />}
                    </button>
                  ))}
                </div>
                <div className="flex gap-4">
                  <Button variant="ghost" onClick={handlePrev} className="h-14 rounded-3xl flex-1">Voltar</Button>
                  <Button disabled={!formData.servico} onClick={handleNext} className="h-14 rounded-3xl bg-gold-gradient text-primary-foreground font-black text-lg flex-1 shadow-xl">Próximo</Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6 animate-in slide-in-from-right duration-500 max-w-md mx-auto">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-primary ml-1 text-center block">Escolha seu Horário</Label>
                <div className="flex gap-3 overflow-x-auto pb-4">
                  {days.map((day) => (
                    <button key={day.toISOString()} onClick={() => setFormData({...formData, data: format(day,"yyyy-MM-dd")})} className={`flex flex-col items-center justify-center min-w-[70px] h-20 rounded-2xl border ${formData.data === format(day,"yyyy-MM-dd") ? "bg-gold-gradient text-white border-transparent scale-105" : "bg-muted/20 border-border"}`}>
                      <span className="text-[10px] uppercase font-bold">{format(day, "EEE", { locale: ptBR })}</span>
                      <span className="text-xl font-black">{format(day, "dd")}</span>
                    </button>
                  ))}
                </div>
                {formData.data && (
                  <div className="grid grid-cols-3 gap-3 animate-in fade-in">
                    {times.map((time) => (
                      <button key={time} onClick={() => setFormData({...formData, hora: time})} className={`h-12 rounded-xl border text-sm font-bold ${formData.hora === time ? "bg-primary text-white" : "bg-muted/20 border-border"}`}>{time}</button>
                    ))}
                  </div>
                )}
                <div className="flex gap-4">
                  <Button variant="ghost" onClick={handlePrev} className="h-14 rounded-3xl flex-1">Voltar</Button>
                  <Button disabled={!formData.hora} onClick={handleNext} className="h-14 rounded-3xl bg-gold-gradient text-primary-foreground font-black text-lg flex-1 shadow-xl">Próximo</Button>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-10 animate-in slide-in-from-right duration-500">
                <div className="text-center space-y-2"><h3 className="text-2xl font-bold">Ficha de Anamnese</h3><p className="text-sm text-muted-foreground italic">Obrigatório para o primeiro atendimento</p></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input placeholder="CPF" value={formData.anamnese.cpf} onChange={(e) => handleCpfChange(e.target.value)} className="h-12 rounded-xl" />
                  <Input placeholder="Nascimento" value={formData.anamnese.dataNascimento} onChange={(e) => handleBirthDateChange(e.target.value)} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[{ id: 'tireoide', label: 'Tireoide?', field: 'problemaTireoide' }, { id: 'alergia', label: 'Alergia?', field: 'alergiaCosmeticos' }].map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border">
                        <Label className="text-xs font-bold">{item.label}</Label>
                        <Checkbox checked={!!(formData.anamnese as any)[item.field]} onCheckedChange={(v) => setFormData({...formData, anamnese: {...formData.anamnese, [item.field]: !!v}})} />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-4">
                    <Label className="text-xs font-bold uppercase tracking-widest text-primary">Assinatura Digital</Label>
                    <div className="border-2 border-dashed border-primary/20 rounded-3xl bg-white relative">
                      <canvas ref={canvasRef} onMouseDown={startDrawing} onMouseUp={stopDrawing} onMouseMove={draw} onTouchStart={startDrawing} onTouchEnd={stopDrawing} onTouchMove={draw} className="w-full h-[180px] cursor-crosshair touch-none" />
                      <Button variant="ghost" onClick={clearSignature} className="absolute bottom-2 right-2 rounded-full h-8 w-8 p-0"><Eraser size={14} /></Button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button variant="ghost" onClick={handlePrev} className="h-14 rounded-3xl flex-1">Voltar</Button>
                  <Button disabled={!formData.anamnese.assinatura || !formData.anamnese.cpf || loading} onClick={handleSubmit} className="h-14 rounded-3xl bg-gold-gradient text-primary-foreground font-black text-lg flex-1 shadow-xl">{loading ? <Loader2 className="animate-spin" /> : "Finalizar"}</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

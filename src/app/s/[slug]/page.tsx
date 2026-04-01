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
    const p = perfil
    if (!p) return
    async function fetchConfig() {
      if (!p) return
      try {
        const profileId = p.id;
        const [wh, vm, tks] = await Promise.all([
          getWorkingHours(profileId),
          getVacationMode(profileId),
          getTechniques(profileId)
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

  useEffect(() => {
    if (step === 5 && canvasRef.current) {
      const canvas = canvasRef.current
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
    }
  }, [step])

  const handleNext = () => setStep(prev => prev + 1)
  const handlePrev = () => setStep(prev => prev - 1)

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

  if (perfilLoading) {
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
          <Button onClick={() => window.location.href = '/'} className="mt-4 rounded-full px-8">Voltar ao Início</Button>
        </div>
      </div>
    )
  }

  if (configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center bg-background/50 backdrop-blur-[2px]">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background/50 backdrop-blur-md">
        <div className="bg-card/60 backdrop-blur-3xl p-10 rounded-[3rem] border border-primary/30 shadow-2xl space-y-8 max-w-md w-full animate-in zoom-in duration-500">
          <div className="flex justify-center">
            <CheckCircle2 className="text-green-500" size={64} />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-4xl font-headline text-gold-gradient">Tudo Pronto!</h1>
            <p className="text-muted-foreground">
              Obrigada, {formData.nome.split(' ')[0]}! Seu horário e ficha foram recebidos pelo estúdio <strong>{perfil.nome_exibicao}</strong>.
            </p>
          </div>

          <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
            <p className="text-xs text-primary/60 font-bold uppercase tracking-widest mb-1">Horário Reservado</p>
            <p className="text-lg font-black text-foreground">
              {formData.data ? format(new Date(formData.data + 'T00:00:00'), "dd 'de' MMMM", { locale: ptBR }) : ''} às {formData.hora}
            </p>
          </div>

          <div className="bg-primary/10 border-2 border-primary/40 p-6 rounded-[2rem] space-y-4 animate-pulse-subtle relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-20">
               <AlertCircle size={40} className="text-primary" />
            </div>
            <div className="flex justify-center mb-1">
               <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest">
                 <MessageCircle size={12} /> Aviso Importante
               </div>
            </div>
            <p className="text-base font-bold text-foreground leading-relaxed">
              Fique atenta ao seu celular! Em breve entraremos em contato via <strong>WhatsApp</strong> para realizar a confirmação final.
            </p>
          </div>

          <div className="pt-4">
            <Crown className="text-primary mx-auto opacity-40" size={32} />
          </div>
        </div>
      </div>
    )
  }

  if (vacationMode?.active) {
    return (
      <div className="min-h-screen py-10 px-4 md:px-8 bg-background/50 backdrop-blur-[2px] flex items-center justify-center">
         <Card className="bg-card/60 backdrop-blur-3xl rounded-[2.5rem] border border-primary/30 shadow-2xl overflow-hidden max-w-lg w-full text-center p-10 space-y-8 animate-in zoom-in duration-500">
           <div className="flex justify-center">
             <div className="p-6 bg-primary/10 rounded-full animate-bounce">
                <Palmtree className="text-primary" size={64} />
             </div>
           </div>
           
           <div className="space-y-4">
             <h1 className="text-4xl font-headline text-gold-gradient py-2 uppercase leading-tight italic">{perfil.nome_exibicao} em Férias</h1>
             <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-line">
               {vacationMode?.message || "Estamos em período de recesso. Nosso sistema de agendamento online está pausado."}
             </p>
           </div>

           {workingHours && (
             <div className="bg-primary/5 rounded-2xl p-4 mt-6 border border-primary/10 text-left space-y-3">
               <p className="text-xs font-bold uppercase tracking-widest text-primary text-center mb-2">
                 Nosso horário normal de funcionamento
               </p>
               <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground">
                 {Object.entries({
                   seg: 'Segunda', ter: 'Terça', qua: 'Quarta', qui: 'Quinta', sex: 'Sexta', sab: 'Sábado', dom: 'Domingo'
                 }).map(([key, label]) => {
                   const wh = workingHours[key as keyof WorkingHours];
                   if (!wh?.active) return null;
                   return (
                     <div key={key} className="flex justify-between border-b border-border/50 pb-1 last:border-0 last:pb-0">
                       <span className="font-semibold">{label}</span>
                       <span>{wh.start} às {wh.end}</span>
                     </div>
                   );
                 })}
               </div>
             </div>
           )}
           
           <div className="pt-4 border-t border-primary/20">
             <p className="text-xs text-primary/60 font-bold uppercase tracking-widest">
               Agradecemos a compreensão. Até logo!
             </p>
           </div>
         </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-10 px-4 md:px-8 bg-background/50 backdrop-blur-[2px]">
      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        <header className="text-center space-y-4 pt-24 pb-12">
          <div className="flex flex-col items-center justify-center gap-6 animate-float-luxury">
            <div className="relative p-1 bg-gold-gradient rounded-full shadow-2xl">
               <div className="absolute inset-0 bg-primary/20 blur-[50px] rounded-full scale-125 -z-10" />
               {perfil.avatar_url || perfil.logo_url ? (
                  <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-background">
                    <Image 
                      src={perfil.avatar_url || perfil.logo_url!} 
                      alt={perfil.nome_exibicao} 
                      fill 
                      className="object-cover"
                      priority
                      unoptimized
                    />
                  </div>
               ) : (
                  <div className="relative w-32 h-32 rounded-full bg-muted flex items-center justify-center border-4 border-background">
                    <Crown className="text-primary" size={48} />
                  </div>
               )}
            </div>
            <h1 className="text-5xl md:text-7xl font-headline text-gold-gradient py-4 italic tracking-tighter drop-shadow-2xl">{perfil.nome_exibicao}</h1>
          </div>
          <p className="text-primary/70 text-[10px] font-bold tracking-[0.5em] uppercase">Exclusive Experience</p>
        </header>

        <Card className="bg-card/60 backdrop-blur-3xl rounded-[2.5rem] border-border shadow-2xl overflow-hidden">
          <CardContent className="p-8 space-y-8">
            
            {step === 1 && (
              <div className="space-y-8 animate-in slide-in-from-right duration-500 max-w-md mx-auto">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                      <User size={14} /> Como podemos te chamar?
                    </Label>
                    <input 
                      placeholder="Seu nome completo" 
                      value={formData.nome}
                      onChange={(e) => setFormData({...formData, nome: e.target.value})}
                      className="w-full h-14 px-6 rounded-2xl bg-muted/30 border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 text-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                      <Phone size={14} /> Seu WhatsApp
                    </Label>
                    <input 
                      placeholder="Ex: 11999999999" 
                      value={formData.whatsapp}
                      type="tel"
                      onChange={(e) => setFormData({...formData, whatsapp: e.target.value.replace(/\D/g, '')})}
                      className="w-full h-14 px-6 rounded-2xl bg-muted/30 border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 text-lg"
                    />
                  </div>
                </div>
                <Button 
                  disabled={!formData.nome.trim() || formData.whatsapp.length < 10 || loading}
                  onClick={handleNext}
                  className="w-full h-16 rounded-3xl bg-gold-gradient text-primary-foreground font-black text-xl gap-2 shadow-xl"
                >
                  {loading ? <Loader2 className="animate-spin" /> : "Próximo"} <ArrowRight size={20} />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8 animate-in slide-in-from-right duration-500 max-w-md mx-auto">
                <div className="space-y-4">
                  <Label className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                    <Sparkles size={14} /> O que vamos fazer hoje?
                  </Label>
                  <div className="grid grid-cols-1 gap-4">
                    {[
                      { id: 'Aplicação', label: 'Aplicação', price: 'R$ 150,00', icon: <Zap size={18} /> },
                      { id: 'Manutenção', label: 'Manutenção', price: 'R$ 100,00', icon: <RotateCw size={18} /> },
                      { id: 'Remoção', label: 'Remoção', price: 'R$ 50,00', icon: <Trash2 size={18} /> }
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setFormData({...formData, tipo: item.id})}
                        className={`p-5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                          formData.tipo === item.id 
                          ? "bg-primary/10 border-primary shadow-inner" 
                          : "bg-muted/20 border-border hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${formData.tipo === item.id ? "bg-primary text-primary-foreground" : "bg-muted text-primary/40"}`}>
                            {item.icon}
                          </div>
                          <div>
                            <p className="font-bold text-foreground">{item.label}</p>
                            <p className="text-xs text-muted-foreground uppercase tracking-tighter">A partir de {item.price}</p>
                          </div>
                        </div>
                        {formData.tipo === item.id && <CheckCircle2 size={20} className="text-primary" />}
                      </button>
                    ))}
                  </div>

                  <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex items-start gap-3 mt-4">
                    <AlertTriangle className="text-primary shrink-0" size={16} />
                    <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                      <strong>Informação Importante:</strong> Os valores informados acima são uma média para o procedimento. O valor final pode variar para mais ou para menos mediante a avaliação técnica da Lash no momento do atendimento.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button variant="ghost" onClick={handlePrev} className="h-14 rounded-3xl gap-2 flex-1">
                    <ArrowLeft size={18} /> Voltar
                  </Button>
                  <Button 
                    disabled={!formData.tipo || loading}
                    onClick={handleNext}
                    className="h-14 rounded-3xl bg-gold-gradient text-primary-foreground font-black text-lg gap-2 flex-1 shadow-xl"
                  >
                    Próximo <ArrowRight size={20} />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-in slide-in-from-right duration-500 max-w-md mx-auto">
                <div className="space-y-4">
                  <Label className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                    <Sparkles size={14} /> Qual técnica você deseja?
                  </Label>
                  <div className="grid grid-cols-1 gap-3">
                    {techniques.map((tech) => (
                      <button
                        key={tech}
                        onClick={() => setFormData({...formData, servico: tech})}
                        className={`h-16 px-6 rounded-2xl border text-left flex items-center justify-between transition-all ${
                          formData.servico === tech 
                          ? "bg-primary/10 border-primary text-primary font-bold shadow-inner" 
                          : "bg-muted/20 border-border text-muted-foreground hover:bg-muted/40"
                        }`}
                      >
                        {tech}
                        {formData.servico === tech && <CheckCircle2 size={18} className="text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button variant="ghost" onClick={handlePrev} className="h-14 rounded-3xl gap-2 flex-1">
                    <ArrowLeft size={18} /> Voltar
                  </Button>
                  <Button 
                    disabled={!formData.servico || loading}
                    onClick={handleNext}
                    className="h-14 rounded-3xl bg-gold-gradient text-primary-foreground font-black text-lg gap-2 flex-1 shadow-xl"
                  >
                    Próximo <ArrowRight size={20} />
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6 animate-in slide-in-from-right duration-500 max-w-md mx-auto">
                <div className="space-y-4">
                  <Label className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                    <CalendarIcon size={14} /> Escolha o dia
                  </Label>
                  <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                    {days.map((day) => {
                      const dayStr = format(day, "yyyy-MM-dd")
                      const isSelected = formData.data === dayStr
                      return (
                        <button
                          key={dayStr}
                          onClick={() => setFormData({...formData, data: dayStr})}
                          className={`flex flex-col items-center justify-center min-w-[70px] h-20 rounded-2xl border transition-all ${
                            isSelected 
                            ? "bg-gold-gradient text-primary-foreground border-transparent shadow-lg scale-105" 
                            : "bg-muted/20 border-border text-muted-foreground hover:border-primary/30"
                          }`}
                        >
                          <span className="text-[10px] uppercase font-bold">{format(day, "EEE", { locale: ptBR })}</span>
                          <span className="text-xl font-black">{format(day, "dd")}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {formData.data && (
                  <div className="space-y-4 animate-in fade-in duration-500">
                    <Label className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                      <Clock size={14} /> Escolha o horário
                    </Label>
                    <div className="grid grid-cols-3 gap-3">
                      {times.length > 0 ? times.map((time) => {
                        const isSelected = formData.hora === time
                        return (
                          <button
                            key={time}
                            onClick={() => setFormData({...formData, hora: time})}
                            className={`h-12 rounded-xl border text-sm font-bold transition-all ${
                              isSelected 
                              ? "bg-primary text-primary-foreground border-primary shadow-lg" 
                              : "bg-muted/20 border-border text-muted-foreground hover:bg-muted/40"
                            }`}
                          >
                            {time}
                          </button>
                        )
                      }) : (
                        <div className="col-span-3 text-center py-4 text-sm text-muted-foreground">
                          Nenhum horário disponível para este dia.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button variant="ghost" onClick={handlePrev} className="h-14 rounded-3xl gap-2 flex-1">
                    <ArrowLeft size={18} /> Voltar
                  </Button>
                  <Button 
                    disabled={!formData.data || !formData.hora || loading}
                    onClick={handleNext}
                    className="h-14 rounded-3xl bg-gold-gradient text-primary-foreground font-black text-lg gap-2 flex-1 shadow-xl"
                  >
                    Próximo <ArrowRight size={20} />
                  </Button>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-10 animate-in slide-in-from-right duration-500">
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-foreground">Ficha de Anamnese</h3>
                  <p className="text-sm text-muted-foreground">Preencha seus dados de saúde para um atendimento seguro.</p>
                </div>

                <div className="space-y-6">
                  <h4 className="text-primary flex items-center gap-2 font-bold text-sm border-b border-primary/10 pb-2">
                    <User size={18} /> Dados Cadastrais
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold tracking-wider">CPF</Label>
                      <input 
                        placeholder="000.000.000-00" 
                        value={formData.anamnese.cpf}
                        onChange={(e) => handleCpfChange(e.target.value)}
                        className="w-full h-12 px-4 rounded-xl bg-muted/30 border border-border focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold tracking-wider">RG</Label>
                      <input 
                        placeholder="00.000.000-0" 
                        value={formData.anamnese.rg}
                        onChange={(e) => handleRgChange(e.target.value)}
                        className="w-full h-12 px-4 rounded-xl bg-muted/30 border border-border focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold tracking-wider">Profissão</Label>
                      <input 
                        placeholder="Sua profissão" 
                        value={formData.anamnese.profissao}
                        onChange={(e) => setFormData({...formData, anamnese: {...formData.anamnese, profissao: e.target.value}})}
                        className="w-full h-12 px-4 rounded-xl bg-muted/30 border border-border focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold tracking-wider">Data de Nascimento</Label>
                      <input 
                        placeholder="DD/MM/AAAA" 
                        value={formData.anamnese.dataNascimento}
                        onChange={(e) => handleBirthDateChange(e.target.value)}
                        className="w-full h-12 px-4 rounded-xl bg-muted/30 border border-border focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-primary flex items-center gap-2 font-bold text-sm border-b border-primary/10 pb-2">
                    <HeartPulse size={18} /> Saúde e Cuidados
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { id: 'procedimento', label: 'Proc. olhos recente?', field: 'procedimentoRecenteOlhos' },
                      { id: 'alergia', label: 'Alergia a cosméticos?', field: 'alergiaCosmeticos' },
                      { id: 'tireoide', label: 'Problemas de tireoide?', field: 'problemaTireoide' },
                      { id: 'ocular', label: 'Problema ocular?', field: 'problemaOcular' },
                      { id: 'onco', label: 'Tratamento oncológico?', field: 'tratamentoOncologico' },
                      { id: 'gestante', label: 'Gestante/Lactante?', field: 'gestanteLactante' }
                    ].map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/50">
                        <Label className="text-xs font-semibold">{item.label}</Label>
                        <div className="flex gap-4">
                          <div className="flex items-center gap-1.5">
                            <Checkbox 
                              checked={!!(formData.anamnese as any)[item.field]}
                              onCheckedChange={(c) => setFormData({...formData, anamnese: {...formData.anamnese, [item.field]: true}})}
                              className="rounded-full h-4 w-4"
                            />
                            <span className="text-[10px] font-bold text-primary">Sim</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Checkbox 
                              checked={!(formData.anamnese as any)[item.field]}
                              onCheckedChange={(c) => setFormData({...formData, anamnese: {...formData.anamnese, [item.field]: false}})}
                              className="rounded-full h-4 w-4"
                            />
                            <span className="text-[10px] text-muted-foreground">Não</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                      <Sparkles size={14} /> Dorme de lado?
                    </Label>
                    <Select 
                      value={formData.anamnese.dormeDeLado}
                      onValueChange={(val: any) => setFormData({...formData, anamnese: {...formData.anamnese, dormeDeLado: val}})}
                    >
                      <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Não">Não</SelectItem>
                        <SelectItem value="Sim, Lado Direito">Sim, Lado Direito</SelectItem>
                        <SelectItem value="Sim, Lado Esquerdo">Sim, Lado Esquerdo</SelectItem>
                        <SelectItem value="Sim, Ambos os lados">Sim, Ambos os lados</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                   <h4 className="text-primary flex items-center gap-2 font-bold text-sm border-b border-primary/10 pb-2">
                    <Camera size={18} /> Autorização e Assinatura
                  </h4>
                  <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 space-y-3">
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Autorizo o estúdio <strong>{perfil.nome_exibicao}</strong> a utilizar fotos/vídeos para fins de portfólio e redes sociais.
                    </p>
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        id="auth-img" 
                        checked={formData.anamnese.autorizaImagem}
                        onCheckedChange={(c) => setFormData({...formData, anamnese: {...formData.anamnese, autorizaImagem: !!c}})}
                        className="h-5 w-5"
                      />
                      <Label htmlFor="auth-img" className="text-xs font-bold text-primary cursor-pointer">Sim, eu autorizo</Label>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                      <PenLine size={14} /> Assinatura Digital
                    </Label>
                    <div className="relative border-2 border-dashed border-primary/20 rounded-3xl bg-white overflow-hidden">
                      <canvas 
                        ref={canvasRef}
                        onMouseDown={startDrawing}
                        onMouseUp={stopDrawing}
                        onMouseOut={stopDrawing}
                        onMouseMove={draw}
                        onTouchStart={startDrawing}
                        onTouchEnd={stopDrawing}
                        onTouchMove={draw}
                        className="w-full h-[180px] cursor-crosshair touch-none"
                      />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={clearSignature}
                        className="absolute bottom-2 right-2 text-primary hover:bg-primary/10 rounded-full h-8 w-8"
                      >
                        <Eraser size={16} />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button variant="ghost" onClick={handlePrev} className="h-14 rounded-3xl gap-2 flex-1">
                    <ArrowLeft size={18} /> Voltar
                  </Button>
                  <Button 
                    disabled={!formData.anamnese.assinatura || !formData.anamnese.cpf || loading}
                    onClick={handleSubmit}
                    className="h-14 rounded-3xl bg-gold-gradient text-primary-foreground font-black text-lg gap-2 flex-1 shadow-xl"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : "Agendar"}
                  </Button>
                </div>
              </div>
            )}

          </CardContent>
        </Card>

        <footer className="text-center text-primary/30 text-[10px] font-light tracking-[0.2em] uppercase py-4">
          <p>&copy; {new Date().getFullYear()} {perfil.nome_exibicao} • Luxury Experience</p>
        </footer>
      </div>
    </div>
  )
}

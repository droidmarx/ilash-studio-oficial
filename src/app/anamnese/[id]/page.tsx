
"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { getClient, updateClient, Client, Anamnese } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ClipboardList, Save, AlertTriangle, Loader2, Crown, CheckCircle2, Camera, Eraser, PenLine, Sparkles, Info, Upload } from "lucide-react"

export default function ClientAnamnesePage() {
  const { id } = useParams()
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [autorizaImagem, setAutorizaImagem] = useState(true)

  // Assinatura por canvas
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [signatureData, setSignatureData] = useState<string | undefined>(undefined)
  const [signatureMode, setSignatureMode] = useState<'draw' | 'upload'>('draw')

  useEffect(() => {
    async function loadClient() {
      if (typeof id !== 'string') return
      try {
        const data = await getClient(id)
        setClient(data)
        setAutorizaImagem(data.anamnese?.autorizaImagem ?? true)
        // Se já tiver assinatura, mostra direto
        if (data.anamnese?.assinatura) {
          setSignatureData(data.anamnese.assinatura)
        }
      } catch (error) {
        console.error("Erro ao carregar cliente", error)
      } finally {
        setLoading(false)
      }
    }
    loadClient()
  }, [id])

  useEffect(() => {
    if (signatureMode === 'draw') {
      const canvas = canvasRef.current
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        canvas.width = rect.width
        canvas.height = rect.height
      }
    }
  }, [loading, signatureMode])

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
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return
    const { x, y } = getCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (canvas) {
      setSignatureData(canvas.toDataURL())
    }
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return
    if ('touches' in e) e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
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
    e.stopPropagation()
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.beginPath()
      }
    }
    setSignatureData(undefined)
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setSignatureData(ev.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!client || typeof id !== 'string') return
    setSaving(true)
    try {
      const updatedAnamnese: Anamnese = {
        ...client.anamnese,
        autorizaImagem,
        assinatura: signatureData,
      }
      await updateClient(id, {
        anamnese: updatedAnamnese,
      })
      setSuccess(true)
    } catch (error) {
      console.error("Erro ao salvar", error)
    } finally {
      setSaving(false)
    }
  }

  // Verifica se o admin preencheu os dados principais
  const adminFilledData = !!(
    client?.anamnese?.cpf ||
    client?.anamnese?.rg ||
    client?.anamnese?.profissao ||
    client?.anamnese?.dataNascimento ||
    client?.anamnese?.dormeDeLado
  )

  const healthItems = [
    { label: 'Fez algum procedimento recentemente nos olhos?', field: 'procedimentoRecenteOlhos' as keyof Anamnese },
    { label: 'Possui alergia à esmaltes/cianoacrilato?', field: 'alergiaCosmeticos' as keyof Anamnese },
    { label: 'Possui problemas de tireóide?', field: 'problemaTireoide' as keyof Anamnese },
    { label: 'Possui glaucoma/blefarite/algum problema ocular?', field: 'problemaOcular' as keyof Anamnese },
    { label: 'Está em tratamento oncológico?', field: 'tratamentoOncologico' as keyof Anamnese },
    { label: 'Está gestante ou lactante?', field: 'gestanteLactante' as keyof Anamnese },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-background">
        <Loader2 className="animate-spin text-primary mb-4" size={48} />
        <p className="text-xl text-primary font-light tracking-widest">Carregando ficha...</p>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-background">
        <h1 className="text-3xl font-headline text-gold-gradient mb-4">Link Expirado ou Inválido</h1>
        <p className="text-muted-foreground">Por favor, solicite um novo link ao I Lash Studio.</p>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-background animate-in fade-in duration-1000">
        <div className="bg-card/60 backdrop-blur-3xl p-10 rounded-[3rem] border border-primary/30 shadow-2xl space-y-6 max-w-md w-full">
          <div className="flex justify-center">
            <CheckCircle2 className="text-green-500" size={64} />
          </div>
          <h1 className="text-4xl font-headline text-gold-gradient">Obrigada, {client.nome.split(' ')[0]}!</h1>
          <p className="text-muted-foreground">Sua ficha foi confirmada e assinada com sucesso. Estamos ansiosas para cuidar do seu olhar!</p>
          <div className="pt-4">
            <Crown className="text-primary mx-auto opacity-40" size={32} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-10 px-4 md:px-8 bg-background/50 backdrop-blur-[2px]">
      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <header className="text-center space-y-4">
          <div className="flex justify-center mb-2">
            <Crown className="text-primary" size={32} />
          </div>
          <h1 className="text-5xl md:text-6xl font-headline text-gold-gradient py-2">I Lash Studio</h1>
          <div className="space-y-1">
            <p className="text-primary/70 text-[10px] md:text-xs font-bold tracking-[0.4em] uppercase">Confirmação de Anamnese</p>
            <h2 className="text-2xl font-bold text-foreground">Olá, {client.nome}!</h2>
            <p className="text-sm text-muted-foreground">
              Revise seus dados abaixo, confirme a autorização de imagem e assine digitalmente.
            </p>
          </div>
        </header>

        <div className="bg-card/60 backdrop-blur-3xl rounded-[2.5rem] border border-border p-6 md:p-10 shadow-2xl space-y-10">

          {/* Aviso se admin ainda não preencheu */}
          {!adminFilledData && (
            <div className="flex items-start gap-3 bg-primary/10 border border-primary/20 rounded-2xl p-4">
              <Info className="text-primary shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-sm font-bold text-primary">Ficha sendo preparada</p>
                <p className="text-xs text-muted-foreground mt-1">
                  O I Lash Studio ainda está preparando sua ficha. Em breve você receberá um novo link para confirmar e assinar. Caso tenha dúvidas, entre em contato pelo WhatsApp.
                </p>
              </div>
            </div>
          )}

          {/* Dados Cadastrais — somente leitura */}
          {adminFilledData && (
            <div className="space-y-6">
              <h3 className="text-primary flex items-center gap-3 font-bold text-lg border-b border-primary/10 pb-2">
                <ClipboardList size={24} /> Seus Dados Cadastrais
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'CPF', value: client.anamnese?.cpf },
                  { label: 'RG', value: client.anamnese?.rg },
                  { label: 'Profissão', value: client.anamnese?.profissao },
                  { label: 'Data de Nascimento', value: client.anamnese?.dataNascimento },
                ].map((item) => (
                  <div key={item.label} className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{item.label}</Label>
                    <div className="w-full px-4 rounded-2xl h-12 bg-muted/20 border border-border/50 flex items-center text-foreground/70 text-sm">
                      {item.value || <span className="text-muted-foreground/40 italic text-xs">Não informado</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Saúde — somente leitura */}
          {adminFilledData && (
            <div className="space-y-6">
              <h3 className="text-primary flex items-center gap-3 font-bold text-lg border-b border-primary/10 pb-2">
                <AlertTriangle size={24} /> Saúde e Histórico
              </h3>
              <div className="space-y-3">
                {healthItems.map((item) => {
                  const val = client.anamnese?.[item.field] as boolean | undefined
                  return (
                    <div key={item.field} className="flex items-center justify-between bg-muted/20 px-4 py-3 rounded-2xl border border-border/50">
                      <span className="text-sm text-foreground/80 leading-relaxed flex-1 pr-4">{item.label}</span>
                      <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                        val ? 'bg-destructive/20 text-destructive' : 'bg-green-500/10 text-green-600'
                      }`}>
                        {val ? 'Sim' : 'Não'}
                      </span>
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center justify-between bg-muted/20 px-4 py-3 rounded-2xl border border-border/50">
                <span className="text-sm text-foreground/80 flex items-center gap-2">
                  <Sparkles size={14} className="text-primary" /> Dorme de lado?
                </span>
                <span className="text-xs font-black text-primary/70">
                  {client.anamnese?.dormeDeLado || 'Não'}
                </span>
              </div>

              {client.anamnese?.observacoesGerais && (
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Observações</Label>
                  <div className="w-full px-4 py-3 rounded-2xl bg-muted/20 border border-border/50 text-sm text-foreground/70 min-h-[80px]">
                    {client.anamnese.observacoesGerais}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Autorização de Imagem — editável pelo cliente */}
          <div className="space-y-6">
            <h3 className="text-primary flex items-center gap-3 font-bold text-lg border-b border-primary/10 pb-2">
              <Camera size={24} /> Autorização de Imagem
            </h3>
            <div className="bg-primary/5 p-6 rounded-[2rem] border border-primary/20 space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Autorizo o <strong>I Lash Studio</strong> a utilizar fotos e vídeos dos meus olhos/rosto obtidos durante o procedimento para fins de portfólio, redes sociais e material informativo.
              </p>
              <div className="flex items-center gap-4">
                <Checkbox
                  id="autoriza"
                  checked={autorizaImagem}
                  onCheckedChange={(c) => setAutorizaImagem(!!c)}
                  className="h-6 w-6"
                />
                <Label htmlFor="autoriza" className="font-bold text-primary cursor-pointer">
                  Sim, eu autorizo o uso da imagem
                </Label>
              </div>
            </div>
          </div>

          {/* Assinatura Digital — canvas ou upload de foto */}
          <div className="space-y-6">
            <h3 className="text-primary flex items-center gap-3 font-bold text-lg border-b border-primary/10 pb-2">
              <PenLine size={24} /> Assinatura Digital
            </h3>

            {/* Tabs de modo */}
            <div className="flex gap-2">
              <button
                onClick={() => { setSignatureMode('draw'); setSignatureData(undefined); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all border ${
                  signatureMode === 'draw'
                    ? 'bg-primary/20 border-primary/40 text-primary'
                    : 'bg-muted/20 border-border/50 text-muted-foreground hover:bg-muted/40'
                }`}
              >
                <PenLine size={14} /> Desenhar
              </button>
              <button
                onClick={() => { setSignatureMode('upload'); setSignatureData(undefined); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all border ${
                  signatureMode === 'upload'
                    ? 'bg-primary/20 border-primary/40 text-primary'
                    : 'bg-muted/20 border-border/50 text-muted-foreground hover:bg-muted/40'
                }`}
              >
                <Upload size={14} /> Enviar Foto
              </button>
            </div>

            {signatureMode === 'draw' && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Assine com o dedo ou caneta touch no campo abaixo:</p>
                <div className="relative border-2 border-dashed border-primary/30 rounded-3xl bg-white overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseUp={stopDrawing}
                    onMouseOut={stopDrawing}
                    onMouseMove={draw}
                    onTouchStart={startDrawing}
                    onTouchEnd={stopDrawing}
                    onTouchMove={draw}
                    className="w-full h-[200px] cursor-crosshair touch-none"
                  />
                  {signatureData && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={clearSignature}
                      className="absolute bottom-4 right-4 text-primary hover:bg-primary/10 rounded-full h-10 w-10"
                    >
                      <Eraser size={20} />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {signatureMode === 'upload' && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">Envie uma foto da sua assinatura (JPG ou PNG):</p>
                {signatureData ? (
                  <div className="space-y-3">
                    <div className="border-2 border-primary/20 rounded-2xl bg-white overflow-hidden p-2">
                      <img src={signatureData} alt="Assinatura" className="max-h-[180px] mx-auto object-contain" />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSignatureData(undefined)}
                      className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 gap-2"
                    >
                      <Eraser size={14} /> Remover e enviar outra
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-primary/30 rounded-3xl bg-white p-8 cursor-pointer hover:bg-primary/5 transition-colors">
                    <Upload className="text-primary" size={32} />
                    <span className="text-xs text-muted-foreground font-medium">Clique para selecionar a foto</span>
                    <span className="text-[10px] text-muted-foreground/60">JPG, PNG • Máx. 5MB</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </label>
                )}
              </div>
            )}
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || !signatureData || (!adminFilledData && false)}
            className="w-full rounded-3xl h-16 bg-gold-gradient text-primary-foreground font-black text-xl shadow-xl hover:scale-[1.02] transition-transform active:scale-95 flex items-center gap-3"
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save size={24} />}
            {saving ? "Salvando..." : "Confirmar e Assinar"}
          </Button>

          {!signatureData && (
            <p className="text-center text-xs text-muted-foreground">
              {signatureMode === 'draw' ? '✍️ Assine no campo acima para finalizar' : '📷 Envie a foto da assinatura para finalizar'}
            </p>
          )}
        </div>

        <footer className="text-center text-primary/30 text-[10px] font-light tracking-[0.2em] uppercase py-8">
          <p>&copy; {new Date().getFullYear()} I Lash Studio • Luxury Experience</p>
        </footer>
      </div>
    </div>
  )
}

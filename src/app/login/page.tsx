"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Loader2, Mail, Lock, UserPlus, Eye, EyeOff } from "lucide-react"
import Image from "next/image"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth/AuthContext"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (!authLoading && user) {
      router.push("/")
    }
  }, [user, authLoading, router])

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          setError("As senhas não coincidem.")
          setLoading(false)
          return
        }

        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nome_exibicao: name || email.split('@')[0],
            }
          }
        })
        if (signUpError) throw signUpError
        toast({ title: "Verifique seu e-mail", description: "Enviamos um link de confirmação para você." })
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) throw signInError
        router.push("/")
      }
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro na autenticação.")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError("")
    
    const getURL = () => {
      let url = process?.env?.NEXT_PUBLIC_SITE_URL ?? 'https://ilash-studio-oficial.vercel.app/'
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        url = 'http://localhost:9002/'
      }
      url = url.charAt(url.length - 1) === '/' ? url : `${url}/`
      return url
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getURL(),
        },
      })
      if (error) throw error
    } catch (err: any) {
      setError("Erro ao conectar com Google.")
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-background">
      <div className="absolute inset-0 -z-10 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
      
      <Card className="w-full max-w-md bg-card/60 backdrop-blur-3xl border-border shadow-2xl rounded-[2.5rem] overflow-hidden animate-in zoom-in duration-500">
        <CardHeader className="pt-10 pb-4 text-center">
          <div className="flex flex-col items-center justify-center gap-4">
            <Image src="/logo.png" alt="Logo" width={100} height={50} className="drop-shadow-glow" priority unoptimized />
            <h1 className="text-2xl font-headline text-gold-gradient">I Lash Studio</h1>
          </div>
          <CardTitle className="text-lg mt-4 font-bold uppercase tracking-widest text-primary/80">
            {isSignUp ? "Criar Minha Conta" : "Portal de Gestão"}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="px-8 pb-10 space-y-6">
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isSignUp && (
              <div className="relative">
                <Input 
                  placeholder="Seu Nome" 
                  className="pl-10 h-12 bg-background/50 border-primary/20 rounded-xl"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 text-primary/40" size={18} />
              <Input 
                type="email"
                placeholder="E-mail" 
                className="pl-10 h-12 bg-background/50 border-primary/20 rounded-xl"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 text-primary/40" size={18} />
              <Input 
                type={showPassword ? "text" : "password"}
                placeholder="Senha" 
                className="pl-10 pr-10 h-12 bg-background/50 border-primary/20 rounded-xl"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-primary/40 hover:text-primary transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {isSignUp && (
              <div className="relative animate-in slide-in-from-top-2 duration-300">
                <Lock className="absolute left-3 top-3.5 text-primary/40" size={18} />
                <Input 
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirme sua Senha" 
                  className="pl-10 h-12 bg-background/50 border-primary/20 rounded-xl"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            )}
            <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-gold-gradient font-black uppercase tracking-widest">
              {loading ? <Loader2 className="animate-spin" /> : (isSignUp ? "CADASTRAR" : "ENTRAR")}
            </Button>
          </form>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-primary/10" /></div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
              <span className="bg-card px-2 text-primary/40">Ou continue com</span>
            </div>
          </div>
          
          <Button onClick={handleGoogleLogin} disabled={loading} variant="outline" className="w-full h-12 rounded-xl border-primary/20 font-bold gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </Button>

          <Button variant="link" className="w-full text-xs text-primary/60 hover:text-primary" onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? "Já tenho uma conta? Entrar" : "Novo por aqui? Criar uma conta"}
          </Button>

          {error && <p className="text-[10px] text-destructive text-center uppercase tracking-tighter italic">{error}</p>}
        </CardContent>
      </Card>
    </div>
  )
}

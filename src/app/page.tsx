
"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAgenda } from "@/hooks/use-agenda"
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth,
  setHours,
  setMinutes,
  addDays,
  isWithinInterval
} from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarDay } from "@/components/agenda/CalendarDay"
import { EventModal } from "@/components/agenda/EventModal"
import { SettingsModal } from "@/components/agenda/SettingsModal"
import { AppointmentForm } from "@/components/agenda/AppointmentForm"
import { AppointmentsList } from "@/components/agenda/AppointmentsList"
import { ClientsManager } from "@/components/agenda/ClientsManager"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  Settings, 
  Plus, 
  Calendar as CalendarIcon, 
  Users, 
  Crown, 
  LogOut,
  Menu as MenuIcon,
  X as CloseIcon,
  DollarSign,
  TrendingUp
} from "lucide-react"
import { Client } from "@/lib/api"
import { Toaster } from "@/components/ui/toaster"
import { cn } from "@/lib/utils"
import Image from "next/image"

import { SetupModal } from "@/components/auth/SetupModal"
import { getProfile, Perfil } from "@/lib/api"
import { useAuth } from "@/components/auth/AuthContext"

// Lista de fontes suportadas (PASSO 10)
const SUPPORTED_FONTS = [
  "Poppins", "Playfair Display", "Lora", "Montserrat", "Raleway", 
  "Roboto", "Open Sans", "Oswald", "Inter", "Cinzel"
];

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

export default function AgendaPage() {
  const router = useRouter()
  const { user, loading: authLoading, signOut } = useAuth()
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [isSetupOpen, setIsSetupOpen] = useState(false)
  
  const { 
    clients,
    loading, 
    currentMonth, 
    nextMonth, 
    prevMonth, 
    getDayEvents, 
    getDayBirthdays,
    upcomingAppointments,
    refresh,
    addAppointment,
    editAppointment,
    removeAppointment
  } = useAgenda()

  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [modalEvents, setModalEvents] = useState<Client[]>([])
  const [modalBirthdays, setModalBirthdays] = useState<Client[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [prefilledDate, setPrefilledDate] = useState<string | undefined>(undefined)
  const [theme, setTheme] = useState<string>('dark')
  const [showSplash, setShowSplash] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login")
      } else {
        setIsAuthorized(true)
        
        getProfile().then(p => {
          if (p) {
            setPerfil(p)
          } else {
            setIsSetupOpen(true)
          }
        })

        const savedTheme = localStorage.getItem('theme') || 'dark'
        setTheme(savedTheme)
        
        // Carrega Fonte Dinâmica (PASSO 10)
        supabase.from('configuracoes').select('valor').eq('nome', 'FONT_FAMILY').maybeSingle().then(({ data }) => {
          if (data?.valor) {
            loadGoogleFont(data.valor);
            document.documentElement.style.setProperty('--font-family', data.valor);
          } else {
            loadGoogleFont('Poppins');
          }
        });

        const allThemes = ['dark', 'ocean', 'emerald', 'amethyst', 'ruby']
        document.documentElement.classList.remove(...allThemes)
        if (savedTheme !== 'light') {
          document.documentElement.classList.add(savedTheme)
        }

        const timer = setTimeout(() => {
          setShowSplash(false)
        }, 4000)
        return () => clearTimeout(timer)
      }
    }
  }, [user, authLoading, router])

  const toggleTheme = (newTheme: string) => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    
    const allThemes = ['dark', 'ocean', 'emerald', 'amethyst', 'ruby']
    document.documentElement.classList.remove(...allThemes)
    if (newTheme !== 'light') {
      document.documentElement.classList.add(newTheme)
    }
  }

  const handleLogout = async () => {
    await signOut()
    router.push("/login")
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate
  })

  // Cálculos de Ganhos
  const parseValue = (val?: string) => {
    if (!val) return 0;
    return parseFloat(val.replace(/[^\d,.-]/g, "").replace(".", "").replace(",", ".")) || 0;
  };

  const gainsData = useMemo(() => {
    const monthlyTotal = clients
      .filter(c => c.confirmado !== false && isSameMonth(new Date(c.data), currentMonth))
      .reduce((acc, curr) => acc + parseValue(curr.valor), 0);

    const weeklyGains = [];
    // Começa na primeira semana que contém dias do mês atual
    let start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const endOfCurrentMonth = endOfMonth(currentMonth);

    while (start <= endOfCurrentMonth) {
      const wStart = startOfWeek(start, { weekStartsOn: 0 });
      const wEnd = endOfWeek(start, { weekStartsOn: 0 });
      
      const weeklyTotal = clients
        .filter(c => {
          if (c.confirmado === false) return false;
          const d = new Date(c.data);
          return isWithinInterval(d, { start: wStart, end: wEnd });
        })
        .reduce((acc, curr) => acc + parseValue(curr.valor), 0);
      
      weeklyGains.push({
        label: `${format(wStart, 'dd/MM')} - ${format(wEnd, 'dd/MM')}`,
        total: weeklyTotal
      });
      
      start = addDays(wEnd, 1);
    }

    return { monthlyTotal, weeklyGains };
  }, [clients, currentMonth]);

  const handleDayClick = (day: Date, events: Client[], birthdays: Client[]) => {
    setSelectedDay(day)
    setModalEvents(events)
    setModalBirthdays(birthdays)
    setIsModalOpen(true)
  }

  const handleOpenAddModal = (date?: Date) => {
    if (date) {
      const now = new Date()
      const dateWithTime = setHours(setMinutes(date, now.getMinutes()), now.getHours())
      setPrefilledDate(dateWithTime.toISOString().slice(0, 16))
    } else {
      setPrefilledDate(undefined)
    }
    setIsAddModalOpen(true)
  }

  const handleAddSubmit = async (data: any) => {
    await addAppointment(data)
    setIsAddModalOpen(false)
  }

  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  if (!isAuthorized) return null

  if (showSplash) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background overflow-hidden">
        <div className="relative flex flex-col items-center gap-6 animate-luxury-zoom">
          <div className="relative animate-float-luxury p-8">
            <div className="absolute inset-0 bg-primary/20 blur-[60px] rounded-full scale-125 -z-10" />
            <div className="absolute inset-0 bg-primary/5 blur-[30px] rounded-full -z-10" />
            <Image 
              src="/logo.png" 
              alt="I Lash Studio Logo" 
              width={150} 
              height={75} 
              className="drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] relative z-10"
              priority
              unoptimized
            />
          </div>

          <div className="flex flex-col items-center gap-2">
            <h1 className="text-6xl md:text-9xl font-headline text-gold-gradient py-2 drop-shadow-2xl tracking-tight">
              I Lash Studio
            </h1>
            <p className="text-primary/40 text-[10px] md:text-xs font-bold tracking-[0.6em] uppercase animate-pulse">
              The Art of Eyelash Design
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4 md:px-8 font-body bg-background/50 backdrop-blur-[2px] text-foreground animate-in fade-in duration-1000">
      
      <div className="fixed top-8 right-8 z-[70]">
        <DropdownMenu modal={false} open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              className={cn(
                "rounded-full w-16 h-16 shadow-2xl bg-gold-gradient text-primary-foreground transition-all duration-500 border-none outline-none focus:ring-0 overflow-hidden relative group",
                isDropdownOpen ? "scale-110 rotate-180 shadow-[0_0_50px_rgba(var(--primary),0.6)]" : "hover:scale-110 shadow-[0_0_25px_rgba(var(--primary),0.4)]"
              )}
              title="Painel de Gestão VIP"
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <MenuIcon 
                  size={32} 
                  className={cn(
                    "absolute transition-all duration-500 ease-in-out transform",
                    isDropdownOpen ? "opacity-0 scale-0 rotate-90" : "opacity-100 scale-100 rotate-0"
                  )} 
                />
                <CloseIcon 
                  size={32} 
                  className={cn(
                    "absolute transition-all duration-500 ease-in-out transform",
                    isDropdownOpen ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-0 -rotate-90"
                  )} 
                />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            side="bottom"
            sideOffset={16}
            className="w-56 bg-card/90 backdrop-blur-2xl border-primary/30 rounded-[2rem] p-2 shadow-2xl animate-in slide-in-from-top-4 duration-300 z-[110]"
          >
            <div className="px-3 py-3 border-b border-primary/10 mb-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 text-center flex items-center justify-center gap-2">
                <Crown size={12} /> Gestão Studio
              </p>
            </div>

            <DropdownMenuItem 
              onClick={() => setIsSettingsOpen(true)}
              className="rounded-2xl gap-3 py-4 focus:bg-primary/10 focus:text-primary cursor-pointer transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Settings size={18} className="text-primary" />
              </div>
              <span className="font-bold text-sm">Configurações</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-primary/10 my-2" />

            <DropdownMenuItem 
              onClick={handleLogout}
              className="rounded-2xl gap-3 py-4 focus:bg-destructive/10 text-destructive focus:text-destructive cursor-pointer transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                <LogOut size={18} />
              </div>
              <span className="font-bold text-sm">Sair do Sistema</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Toaster />

      <SetupModal 
        isOpen={isSetupOpen} 
        onComplete={(nome, slug) => {
          setPerfil({ id: user?.id || "", nome_exibicao: nome, slug })
          setIsSetupOpen(false)
        }} 
      />

      <div className="w-full max-w-7xl mx-auto space-y-10">
        
          <header className="text-center space-y-4 mb-12 animate-in fade-in duration-1000">
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              {perfil?.logo_url ? (
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
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Crown className="text-primary animate-bounce" size={24} />
                </div>
              )}
              <h1 className="text-5xl md:text-8xl font-headline text-gold-gradient drop-shadow-2xl py-2 uppercase italic tracking-tighter">
                {perfil?.nome_exibicao || "I Lash Studio"}
              </h1>
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-primary/70 text-sm md:text-base font-medium tracking-[0.3em] uppercase">
                Exclusive Client Experience
              </p>
            {user && (
              <div className="flex flex-col items-center mt-6 animate-in fade-in zoom-in duration-700">
                <div className="relative w-16 h-16 rounded-full p-1 bg-gold-gradient mb-3 shadow-xl">
                  {user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                    <Image 
                      src={user.user_metadata.avatar_url || user.user_metadata.picture} 
                      alt="Perfil" 
                      width={64} 
                      height={64} 
                      className="rounded-full object-cover border-2 border-background"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-muted flex items-center justify-center text-xl font-bold">
                      {user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0)}
                    </div>
                  )}
                </div>
                <p className="text-primary/80 text-xs font-black uppercase tracking-widest">
                  {user.user_metadata?.full_name || 'Profissional I Lash'}
                </p>
                <p className="text-primary/40 text-[9px] font-medium lowercase tracking-tighter">
                  {user.email}
                </p>
              </div>
            )}
            {perfil && (
              <p className="text-[10px] font-bold text-primary/30 tracking-widest uppercase mt-4">
                Seu link: <span className="text-primary/50 lowercase">ilash-studio-oficial.vercel.app/s/{perfil.slug}</span>
              </p>
            )}
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-40">
            <Loader2 className="animate-spin text-primary mb-4" size={48} />
            <p className="text-xl text-primary font-light tracking-widest">Aguarde um instante...</p>
          </div>
        ) : (
          <Tabs defaultValue="agenda" className="w-full space-y-8">
            <div className="flex justify-center">
              <TabsList className="bg-muted/50 backdrop-blur-md border border-border p-1.5 rounded-[2rem] h-16 w-full max-w-md shadow-2xl">
                <TabsTrigger value="agenda" className="flex-1 rounded-[1.5rem] gap-2 data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground h-full transition-all text-base font-semibold">
                  <CalendarIcon size={20} /> Agenda
                </TabsTrigger>
                <TabsTrigger value="clientes" className="flex-1 rounded-[1.5rem] gap-2 data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground h-full transition-all text-base font-semibold">
                  <Users size={20} /> Clientes
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="agenda" className="animate-in fade-in slide-in-from-bottom-4 duration-500 outline-none">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <Card className="rounded-[2.5rem] border-border shadow-2xl bg-card/60 backdrop-blur-2xl overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between px-8 py-10">
                      <Button variant="ghost" size="icon" onClick={() => prevMonth()} className="hover:bg-primary/10 text-primary">
                        <ChevronLeft size={36} />
                      </Button>
                      <CardTitle className="text-3xl md:text-4xl font-headline text-gold-gradient text-center">
                        {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                      </CardTitle>
                      <Button variant="ghost" size="icon" onClick={() => nextMonth()} className="hover:bg-primary/10 text-primary">
                        <ChevronRight size={36} />
                      </Button>
                    </CardHeader>
                    <CardContent className="px-6 pb-6">
                      <div className="grid grid-cols-7 mb-6">
                        {weekdays.map(day => (
                          <div key={day} className="text-center font-bold text-primary/40 text-xs uppercase tracking-widest">
                            {day}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-2 md:gap-4">
                        {calendarDays.map((day, idx) => (
                          <CalendarDay
                            key={idx}
                            day={day}
                            events={getDayEvents(day)}
                            birthdays={getDayBirthdays(day)}
                            isCurrentMonth={isSameMonth(day, monthStart)}
                            onClick={(d, evts, bdays) => handleDayClick(d, evts, bdays)}
                          />
                        ))}
                      </div>

                      {/* Resumo de Ganhos - Estilo VIP */}
                      <div className="mt-12 pt-10 border-t border-primary/10 space-y-8">
                        <div className="flex items-center justify-between px-2">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 flex items-center gap-2">
                               <TrendingUp size={12} /> Faturamento Mensal Estimado
                            </p>
                            <p className="text-4xl md:text-5xl font-headline text-gold-gradient">
                              R$ {gainsData.monthlyTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div className="w-16 h-16 rounded-full bg-gold-gradient/10 flex items-center justify-center border border-primary/20">
                             <DollarSign className="text-primary" size={32} />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-2">
                          {gainsData.weeklyGains.map((week, i) => (
                            <div key={i} className="bg-muted/30 p-4 rounded-3xl border border-border/50 hover:border-primary/30 transition-colors group">
                              <p className="text-[9px] font-bold text-primary/60 uppercase mb-2 group-hover:text-primary transition-colors">{week.label}</p>
                              <p className="text-lg font-black text-foreground">
                                R$ {week.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div className="lg:col-span-1">
                  <AppointmentsList 
                    appointments={upcomingAppointments} 
                    onEdit={editAppointment}
                    loading={loading}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="clientes" className="animate-in fade-in slide-in-from-bottom-4 duration-500 outline-none">
              <ClientsManager 
                clients={clients} 
                onEdit={editAppointment} 
                onDelete={removeAppointment}
                loading={loading}
              />
            </TabsContent>
          </Tabs>
        )}

        <footer className="text-center pt-20 pb-10 text-primary/20 text-xs font-light tracking-[0.2em] uppercase">
          <p>&copy; {new Date().getFullYear()} I Lash Studio</p>
        </footer>
      </div>

      <EventModal
        day={selectedDay}
        events={modalEvents}
        birthdays={modalBirthdays}
        isOpen={isModalOpen}
        loading={loading}
        onClose={() => {
          setIsModalOpen(false);
        }}
        onAddNew={(date) => {
          setIsModalOpen(false)
          handleOpenAddModal(date)
        }}
        onEdit={async (id, data) => {
          await editAppointment(id, data)
          setIsModalOpen(false)
        }}
        onDelete={async (id) => {
          await removeAppointment(id)
          setIsModalOpen(false)
        }}
      />

      <Dialog open={isAddModalOpen} onOpenChange={(open) => { if (!open) { setIsAddModalOpen(false); } }}>
        <DialogContent className="w-[95vw] sm:max-w-[550px] rounded-[2rem] md:rounded-[2.5rem] bg-background border-border p-4 md:p-8 max-h-[95vh] overflow-y-auto text-foreground">
          <DialogHeader>
            <DialogTitle className="text-3xl md:text-4xl font-headline text-gold-gradient">Novo Agendamento</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm md:text-base">
              Personalize a experiênca para sua cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 md:mt-6">
            <AppointmentForm 
              clients={clients}
              prefilledDate={prefilledDate}
              onSubmit={handleAddSubmit} 
              onCancel={() => { setIsAddModalOpen(false); }} 
              loading={loading}
            />
          </div>
        </DialogContent>
      </Dialog>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => { setIsSettingsOpen(false); }}
        onSave={() => { refresh(); }}
        theme={theme}
        toggleTheme={toggleTheme}
      />
    </div>
  )
}

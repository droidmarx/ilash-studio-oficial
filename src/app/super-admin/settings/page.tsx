"use client"

import React, { useState } from 'react';
import { 
  Settings, 
  Save, 
  MessageSquare, 
  Zap, 
  Globe, 
  ShieldCheck,
  Bell,
  Eye,
  EyeOff,
  Database,
  Lock
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

export default function GlobalSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({ title: "Configurações Salvas", description: "As mudanças globais foram aplicadas." });
    }, 1000);
  };

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-4xl font-headline text-gold-gradient">Configurações Globais</h1>
        <p className="text-sm text-muted-foreground uppercase tracking-widest font-black mt-1">
          Parâmetros técnicos e integrações do sistema
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lado Esquerdo: Configurações Principais */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Integração Telegram */}
          <Card className="bg-card/50 border-border/40 rounded-3xl overflow-hidden shadow-xl">
            <CardHeader className="bg-primary/5 pb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-xl">
                  <MessageSquare className="text-blue-500" size={24} />
                </div>
                <div>
                  <CardTitle className="text-xl font-headline">Notificações Telegram</CardTitle>
                  <CardDescription>Bot que envia alertas de novos agendamentos</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-bold">Bot Status</Label>
                  <p className="text-[10px] text-muted-foreground uppercase font-black">Ativar/Desativar bot globalmente</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <Separator className="bg-border/40" />
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest opacity-50">Telegram Bot Token</Label>
                  <div className="relative">
                    <Input 
                      type={showKey ? "text" : "password"} 
                      defaultValue="678912345:AAF-Your-Telegram-Token-Example"
                      className="pr-10 bg-background/50 rounded-xl"
                    />
                    <button 
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Manutenção e Sistema */}
          <Card className="bg-card/50 border-border/40 rounded-3xl overflow-hidden shadow-xl">
            <CardHeader className="bg-primary/5 pb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-xl">
                  <Zap className="text-orange-500" size={24} />
                </div>
                <div>
                  <CardTitle className="text-xl font-headline">Sistema & Performance</CardTitle>
                  <CardDescription>Gerenciamento de recursos e estado da plataforma</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/10 rounded-2xl">
                <div className="space-y-1">
                  <Label className="text-sm font-bold text-red-500">Modo Manutenção</Label>
                  <p className="text-[10px] text-red-500/60 uppercase font-black">Bloqueia acesso a todos os usuários exceto admins</p>
                </div>
                <Switch />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Tempo de Trial (Dias)</Label>
                  <Input type="number" defaultValue="7" className="bg-background/50 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Preço Base (BRL)</Label>
                  <Input type="number" defaultValue="14.99" className="bg-background/50 rounded-xl" />
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Lado Direito: Info & Status */}
        <div className="space-y-8">
          <Card className="bg-gold-gradient text-primary-foreground rounded-3xl shadow-2xl overflow-hidden relative group">
             <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                <ShieldCheck size={120} />
             </div>
             <CardHeader>
               <CardTitle className="text-xl font-headline">Segurança Ativa</CardTitle>
               <CardDescription className="text-primary-foreground/60">Todos os acessos são criptografados com SSL 256-bit.</CardDescription>
             </CardHeader>
             <CardContent>
               <Button className="w-full bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold uppercase text-[10px] border-none backdrop-blur-md">
                 Ver Relatórios de Segurança
               </Button>
             </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/40 rounded-3xl shadow-sm">
             <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Database className="text-primary" size={20} />
                   </div>
                   <div>
                      <p className="text-xs font-black uppercase tracking-widest">Base de Dados</p>
                      <p className="text-lg font-bold">Supabase Cloud</p>
                   </div>
                </div>
                <Separator className="bg-border/40" />
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Globe className="text-green-500" size={20} />
                   </div>
                   <div>
                      <p className="text-xs font-black uppercase tracking-widest">Região</p>
                      <p className="text-lg font-bold">South America (São Paulo)</p>
                   </div>
                </div>
             </CardContent>
          </Card>

          <Button 
            onClick={handleSave}
            disabled={loading}
            className="w-full h-14 bg-gold-gradient text-primary-foreground rounded-2xl font-bold text-base shadow-xl shadow-primary/20 gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
            {loading ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client"

import React, { useEffect, useState } from 'react';
import { ShieldAlert, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from './AuthContext';

export function ImpersonationBanner() {
  const { user, signOut } = useAuth();
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [targetEmail, setTargetEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Verifica se há flag de impersonação no localStorage
    const flag = localStorage.getItem('is_impersonating');
    const email = localStorage.getItem('impersonated_email');
    
    if (flag === 'true' && user) {
      setIsImpersonating(true);
      setTargetEmail(email || user.email || 'Usuário');
    } else {
      setIsImpersonating(false);
    }
  }, [user]);

  const handleStop = async () => {
    setLoading(true);
    try {
      // O signOut do AuthContext já limpa o localStorage
      await signOut();
      window.location.href = '/login';
    } catch (err) {
      setLoading(false);
    }
  };

  if (!isImpersonating) return null;

  return (
    <div className="bg-orange-500 text-white px-4 py-2 flex items-center justify-between sticky top-0 z-[100] shadow-lg animate-in fade-in slide-in-from-top duration-500">
      <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
        <div className="bg-white/20 p-1.5 rounded-lg shrink-0">
          <ShieldAlert size={18} className="text-white" />
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-0 md:gap-2">
          <p className="text-[10px] md:text-xs font-black uppercase tracking-widest opacity-80">
            Modo de Visualização Ativo
          </p>
          <span className="hidden md:inline opacity-30">|</span>
          <p className="text-xs md:text-sm font-bold truncate">
            Acessando como: <span className="underline decoration-white/30">{targetEmail}</span>
          </p>
        </div>
      </div>

      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleStop}
        disabled={loading}
        className="ml-4 bg-black/10 hover:bg-black/20 text-white rounded-xl border-white/20 hover:border-white/40 font-bold gap-2 shrink-0 transition-all hover:scale-105 active:scale-95"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
        <span className="hidden sm:inline">Encerrar Sessão</span>
        <span className="sm:hidden text-[10px]">Sair</span>
      </Button>
    </div>
  );
}

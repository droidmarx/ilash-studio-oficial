"use client"

import React from 'react';
import { useAuth } from './AuthContext';
import { LogOut, ShieldAlert, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ImpersonationBanner() {
  const { impersonatedUser, stopImpersonating } = useAuth();

  if (!impersonatedUser) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-orange-500 text-white px-4 py-2 flex items-center justify-between shadow-2xl animate-in slide-in-from-top duration-500">
      <div className="flex items-center gap-4">
        <div className="bg-white/20 p-2 rounded-full hidden sm:block">
          <ShieldAlert size={20} />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
          <span className="text-xs font-black uppercase tracking-widest">Modo Impersonação Ativo</span>
          <div className="flex items-center gap-2 bg-black/10 px-3 py-1 rounded-full border border-white/20">
            <User size={14} />
            <span className="text-xs font-bold truncate max-w-[200px]">{impersonatedUser.email || impersonatedUser.id}</span>
          </div>
        </div>
      </div>
      
      <Button 
        variant="ghost" 
        onClick={stopImpersonating}
        className="bg-white text-orange-500 hover:bg-orange-50 hover:text-orange-600 rounded-xl h-9 px-4 font-black uppercase text-[10px] tracking-widest gap-2 shadow-lg"
      >
        <LogOut size={14} />
        Sair do Usuário
      </Button>
    </div>
  );
}

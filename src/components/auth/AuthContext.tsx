"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
  impersonatedUser: { id: string, email?: string } | null;
  stopImpersonating: () => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
  impersonatedUser: null,
  stopImpersonating: () => {},
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [impersonatedUser, setImpersonatedUser] = useState<{ id: string, email?: string } | null>(null)

  useEffect(() => {
    // Busca sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      checkImpersonation(session?.user?.id)
      setLoading(false)
    })

    // Escuta mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      checkImpersonation(session?.user?.id)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const checkImpersonation = async (userId?: string) => {
    if (!userId) {
      setImpersonatedUser(null);
      return;
    }

    // Só permite impersonação se o usuário logado for admin ou super_admin
    const { data: profile } = await supabase
      .from('perfis')
      .select('role')
      .eq('id', userId)
      .single();

    if (profile?.role === 'super_admin' || profile?.role === 'admin') {
      const impId = localStorage.getItem('impersonate_user_id');
      const impEmail = localStorage.getItem('impersonate_user_email');
      if (impId) {
        setImpersonatedUser({ id: impId, email: impEmail || undefined });
      } else {
        setImpersonatedUser(null);
      }
    } else {
      setImpersonatedUser(null);
    }
  }

  const stopImpersonating = () => {
    localStorage.removeItem('impersonate_user_id');
    localStorage.removeItem('impersonate_user_email');
    setImpersonatedUser(null);
    window.location.reload(); // Recarrega para limpar estados de data fetching
  }

  const signOut = async () => {
    localStorage.removeItem('impersonate_user_id');
    localStorage.removeItem('impersonate_user_email');
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut, impersonatedUser, stopImpersonating }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

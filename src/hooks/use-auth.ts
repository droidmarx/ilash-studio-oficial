"use client"

import { useContext } from "react"
import { AuthContext } from "@/components/auth/AuthContext"

/**
 * Hook para acessar o contexto de autenticação do SaaS.
 * Isolado em um arquivo próprio para evitar erros de hoisting e dependências circulares.
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider")
  }
  return context
}

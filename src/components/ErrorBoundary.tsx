"use client"

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle } from "lucide-react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary detectou um erro de renderização:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
         <div className="flex flex-col items-center justify-center min-h-[400px] w-full p-8 text-center bg-card rounded-[2rem] border border-border/40 m-4 shadow-xl">
            <AlertCircle className="w-16 h-16 text-destructive mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-foreground">Falha na Interface</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              {this.state.error?.message || "Ocorreu um erro estrutural ao carregar os dados desta página. Isso geralmente significa um dado não formatado corretamente."}
            </p>
            <button
               onClick={() => this.setState({ hasError: false, error: null })}
               className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm shadow-md transition-transform hover:scale-105"
            >
               Tentar Novamente
            </button>
         </div>
      );
    }

    return this.props.children;
  }
}

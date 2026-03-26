"use client"

import { useState, useEffect } from "react"

export function Sparkles() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="sparkle-bg">
      {/* Purpurina Temática (Glitter) Flutuante */}
      {[...Array(120)].map((_, i) => {
        const size = Math.random() * 5 + 1;
        const delay = Math.random() * 20;
        const duration = 10 + Math.random() * 15;
        const left = Math.random() * 100;
        
        return (
          <div 
            key={`sparkle-${i}`} 
            className="sparkle bg-gold-gradient" 
            style={{
              left: `${left}%`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
              width: `${size}px`,
              height: `${size}px`,
              opacity: 0.4 + Math.random() * 0.6
            }}
          />
        );
      })}

      {/* Estrelas Cadentes Discretas */}
      {[...Array(6)].map((_, i) => (
        <div 
          key={`star-${i}`}
          className="shooting-star"
          style={{
            top: `${Math.random() * 50}%`,
            animationDelay: `${i * 8 + Math.random() * 10}s`,
            animationDuration: `${12 + Math.random() * 10}s`
          }}
        />
      ))}
    </div>
  )
}

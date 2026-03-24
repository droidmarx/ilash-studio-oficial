"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface ThemeToggleProps {
  theme: string
  toggleTheme: (theme: string) => void
}

export function ThemeToggle({ theme, toggleTheme }: ThemeToggleProps) {
  const themes = [
    { id: 'light', name: 'Rose Gold', color: 'bg-[#f7c5b6]' },
    { id: 'dark', name: 'Studio Escuro', color: 'bg-[#222]' },
    { id: 'ocean', name: 'Oceano Prata', color: 'bg-[#153448] ring-[#8E9EAB]' },
    { id: 'emerald', name: 'Esmeralda', color: 'bg-[#0a311b]' },
    { id: 'amethyst', name: 'Ametista', color: 'bg-[#2a1738]' },
    { id: 'ruby', name: 'Rubi', color: 'bg-[#400e16]' },
  ]

  return (
    <div className="flex flex-wrap gap-2 items-center justify-end">
      {themes.map(t => (
        <button
          key={t.id}
          onClick={() => toggleTheme(t.id)}
          title={t.name}
          className={cn(
            "w-8 h-8 rounded-full border border-white/20 transition-all duration-300 flex items-center justify-center shadow-md hover:scale-110",
            t.color,
            theme === t.id ? "border-foreground scale-110 ring-2 ring-foreground/20" : "opacity-80 hover:opacity-100"
          )}
        >
          {theme === t.id && <Check size={14} className="text-white drop-shadow-md" />}
        </button>
      ))}
    </div>
  )
}

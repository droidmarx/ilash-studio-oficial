"use client"

import { RealtimeStatus } from '@/hooks/use-agenda';
import { cn } from '@/lib/utils';

interface RealtimeIndicatorProps {
  status: RealtimeStatus;
}

export function RealtimeIndicator({ status }: RealtimeIndicatorProps) {
  const config = {
    connected: {
      label: 'Ao vivo',
      dot: 'bg-green-500 animate-ping',
      staticDot: 'bg-green-500',
      text: 'text-green-500',
      bg: 'bg-green-500/10 border-green-500/20',
    },
    connecting: {
      label: 'Conectando...',
      dot: 'bg-yellow-500 animate-pulse',
      staticDot: 'bg-yellow-500',
      text: 'text-yellow-500',
      bg: 'bg-yellow-500/10 border-yellow-500/20',
    },
    disconnected: {
      label: 'Offline',
      dot: 'bg-muted-foreground',
      staticDot: 'bg-muted-foreground',
      text: 'text-muted-foreground',
      bg: 'bg-muted/30 border-border/40',
    },
  }[status];

  return (
    <div className={cn(
      'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all duration-500',
      config.bg,
      config.text
    )}>
      {/* Pulsing dot */}
      <span className="relative flex items-center justify-center w-2 h-2">
        {status === 'connected' && (
          <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-75', config.dot)} />
        )}
        <span className={cn('relative inline-flex rounded-full h-2 w-2', config.staticDot)} />
      </span>
      {config.label}
    </div>
  );
}

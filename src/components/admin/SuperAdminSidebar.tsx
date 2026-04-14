"use client"

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  History, 
  Settings, 
  LogOut, 
  UserCircle,
  ShieldCheck,
  Zap,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

interface SidebarItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

const SidebarItem = ({ href, icon, label, active }: SidebarItemProps) => (
  <Link href={href}>
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group",
      active 
        ? "bg-primary/10 text-primary shadow-[0_0_20px_rgba(var(--primary),0.1)]" 
        : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
    )}>
      <div className={cn(
        "transition-transform duration-300 group-hover:scale-110",
        active ? "text-primary" : "text-muted-foreground"
      )}>
        {icon}
      </div>
      <span className="font-bold text-sm tracking-tight">{label}</span>
      {active && <ChevronRight size={16} className="ml-auto animate-pulse" />}
    </div>
  </Link>
);

export default function SuperAdminSidebar({ user }: { user: any }) {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);

  // Fechar sidebar ao navegar em mobile
  React.useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const menuItems = [
    { href: '/super-admin', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { href: '/super-admin/users', icon: <Users size={20} />, label: 'Usuários' },
    { href: '/super-admin/subscriptions', icon: <CreditCard size={20} />, label: 'Assinaturas' },
    { href: '/super-admin/logs', icon: <History size={20} />, label: 'Logs de Auditoria' },
    { href: '/super-admin/settings', icon: <Settings size={20} />, label: 'Configurações' },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header / Logo */}
      <div className="p-8 pb-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gold-gradient rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <ShieldCheck className="text-primary-foreground" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-headline text-gold-gradient">Super Admin</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary/40">I Lash Studio • SaaS</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden text-muted-foreground"
          onClick={() => setIsOpen(false)}
        >
          <X size={24} />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => (
          <SidebarItem 
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={pathname === item.href}
          />
        ))}
      </nav>

      {/* User / Bottom */}
      <div className="p-6 mt-auto border-t border-border/40 space-y-4">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border border-primary/20">
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <UserCircle className="text-primary/60" size={24} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate text-foreground">{user?.email?.split('@')[0] || 'Admin'}</p>
            <p className="text-[10px] text-muted-foreground uppercase font-black truncate">Administrador Geral</p>
          </div>
        </div>

        <Link href="/">
           <Button variant="outline" className="w-full justify-start gap-2 rounded-xl text-primary hover:bg-primary/5 border-primary/10">
              <Zap size={16} />
              <span className="text-xs font-bold uppercase">Painel Studio</span>
           </Button>
        </Link>

        <Button 
          variant="ghost" 
          onClick={signOut}
          className="w-full justify-start gap-2 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut size={16} />
          <span className="text-xs font-bold uppercase">Sair do Sistema</span>
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Botão Hamburger Mobile */}
      <div className="lg:hidden fixed top-4 left-4 z-[60]">
        <Button 
          variant="outline" 
          size="icon" 
          className="bg-card/80 backdrop-blur-md border-primary/20 rounded-xl shadow-lg"
          onClick={() => setIsOpen(true)}
        >
          <Menu size={24} className="text-primary" />
        </Button>
      </div>

      {/* Overlay Mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[50] lg:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-72 bg-card border-r border-border/40 flex-col h-screen sticky top-0 overflow-hidden shrink-0">
        {sidebarContent}
      </aside>

      {/* Drawer Mobile */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-80 bg-card z-[55] lg:hidden transition-transform duration-300 ease-in-out border-r border-border/40 overflow-hidden",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {sidebarContent}
      </aside>
    </>
  );
}

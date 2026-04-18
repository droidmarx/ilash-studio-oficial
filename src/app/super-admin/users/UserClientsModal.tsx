"use client"

import React, { useEffect, useState, useCallback } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Loader2, 
  Trash2, 
  Edit2, 
  Check, 
  X,
  Calendar,
  User,
  Phone
} from 'lucide-react';
import { fetchUserClients, updateSuperAdminClient, deleteSuperAdminClient } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserClientsModalProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
  token: string;
}

export function UserClientsModal({ user, isOpen, onClose, token }: UserClientsModalProps) {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});
  const { toast } = useToast();

  const loadClients = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await fetchUserClients(token, user.id);
      if (error) throw new Error(error);
      setClients(data || []);
    } catch (err) {
      toast({ title: "Erro ao carregar clientes", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, token, toast]);

  useEffect(() => {
    if (isOpen && user) {
      loadClients();
    }
  }, [isOpen, user, loadClients]);

  // ✅ REDE DE SEGURANÇA (Safety Net): 
  // Garante que o body volte a ser clicável se o diálogo fechar incorretamente.
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
        document.body.style.overflow = 'auto';
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleEdit = (client: any) => {
    setEditingId(client.id);
    setEditValues(client);
  };

  const handleSave = async (id: string) => {
    try {
      const { error } = await updateSuperAdminClient(token, id, editValues);
      if (error) throw new Error(error);
      toast({ title: "Cliente atualizado" });
      setEditingId(null);
      loadClients();
    } catch (err) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este cliente permanentemente?")) return;
    try {
      const { error } = await deleteSuperAdminClient(token, id);
      if (error) throw new Error(error);
      toast({ title: "Cliente removido" });
      loadClients();
    } catch (err) {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border/40 rounded-[2rem]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline text-gold-gradient">
            Clientes de {user?.nome_exibicao || user?.email}
          </DialogTitle>
          <DialogDescription className="text-xs uppercase font-black text-muted-foreground/60">
            Gestão completa de agendamentos (Bypass RLS)
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="animate-spin text-primary" size={40} />
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground italic">
              Nenhum cliente cadastrado para este usuário.
            </div>
          ) : (
            <div className="border border-border/40 rounded-2xl overflow-hidden">
              <Table>
                <TableHeader className="bg-primary/5">
                  <TableRow>
                    <TableHead className="text-[10px] uppercase font-black">Cliente</TableHead>
                    <TableHead className="text-[10px] uppercase font-black">Data/Hora</TableHead>
                    <TableHead className="text-[10px] uppercase font-black">Serviço</TableHead>
                    <TableHead className="text-[10px] uppercase font-black text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        {editingId === c.id ? (
                          <div className="space-y-1">
                            <Input 
                              value={editValues.nome} 
                              onChange={(e) => setEditValues({...editValues, nome: e.target.value})}
                              className="h-8 text-xs"
                            />
                            <Input 
                              value={editValues.whatsapp || ''} 
                              onChange={(e) => setEditValues({...editValues, whatsapp: e.target.value})}
                              className="h-8 text-xs"
                              placeholder="WhatsApp"
                            />
                          </div>
                        ) : (
                          <div>
                            <p className="font-bold text-sm">{c.nome}</p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Phone size={10} /> {c.whatsapp || 'N/A'}
                            </p>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === c.id ? (
                          <Input 
                            type="datetime-local"
                            value={c.data ? new Date(c.data).toISOString().slice(0, 16) : ''}
                            onChange={(e) => setEditValues({...editValues, data: e.target.value})}
                            className="h-8 text-xs"
                          />
                        ) : (
                          <div className="text-xs">
                             {c.data ? format(new Date(c.data), "dd/MM/yy 'às' HH:mm", { locale: ptBR }) : '---'}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                         <div className="text-xs font-mono">{c.servico}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        {editingId === c.id ? (
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500" onClick={() => handleSave(c.id)}>
                              <Check size={16} />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setEditingId(null)}>
                              <X size={16} />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(c)}>
                              <Edit2 size={14} />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(c.id)}>
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-xl font-bold">Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

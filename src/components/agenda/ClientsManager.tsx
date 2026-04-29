
"use client"

import { useState } from "react"
import { Client, Anamnese, getCustomMessages, getProfile } from "@/lib/api"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Edit2, Trash2, User, Send, Cake, ClipboardList, Loader2, CheckCircle2, Sparkles, PlusCircle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog"
import { AppointmentForm } from "./AppointmentForm"
import { AnamneseModal } from "./AnamneseModal"
import { ReminderDialog } from "./ReminderDialog"
import { format, parseISO, isValid } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn, parseBirthday, generateWhatsAppMessage } from "@/lib/utils"

interface ClientsManagerProps {
  clients: Client[]
  loading?: boolean
  onEdit: (id: string, data: any) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onAddNew?: (date?: Date) => void
}

export function ClientsManager({ clients, loading, onEdit, onDelete, onAddNew }: ClientsManagerProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [anamneseClient, setAnamneseClient] = useState<Client | null>(null)
  const [reminderClient, setReminderClient] = useState<Client | null>(null)
  const [clientToConfirm, setClientToConfirm] = useState<Client | null>(null)
  const [confirmIncludeLocation, setConfirmIncludeLocation] = useState(true)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const filteredClients = clients.filter(client => 
    client.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.servico.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => b.id.localeCompare(a.id))

  const safeFormatDate = (dateStr: string) => {
    try {
      const date = dateStr.includes('T') ? parseISO(dateStr) : new Date(dateStr)
      return isValid(date) ? format(date, "dd/MM/yyyy HH:mm", { locale: ptBR }) : dateStr
    } catch (e) {
      return dateStr
    }
  }

  const handleDelete = async () => {
    if (deleteConfirmId) {
      try {
        await onDelete(deleteConfirmId);
        setDeleteConfirmId(null);
      } catch (error) {
        console.error("Erro ao excluir", error);
      }
    }
  }

  const handleConfirmBookingFinal = async (client: Client) => {
    await onEdit(client.id, { confirmado: true });
    
    if (client.whatsapp) {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const customMsgs = await getCustomMessages();

      // Detecta se é cliente novo: primeiro agendamento (único registro com este whatsapp)
      const sameWhatsapp = client.whatsapp.replace(/\D/g, "");
      const appointmentsWithSamePhone = clients.filter(
        c => c.whatsapp?.replace(/\D/g, "") === sameWhatsapp
      );
      const isNewClient = appointmentsWithSamePhone.length <= 1;

      // Busca o endereço do estúdio configurado no perfil
      let studioAddress: string | undefined;
      if (confirmIncludeLocation) {
        try {
          const perfil = await getProfile();
          studioAddress = perfil?.studioAddress;
        } catch {
          studioAddress = undefined;
        }
      }

      const message = generateWhatsAppMessage(
        client,
        customMsgs.whatsappReminder,
        client.tipo,
        origin,
        studioAddress,
        isNewClient && confirmIncludeLocation // Só manda o maps se o toggle estiver ligado
      );
      const cleanPhone = client.whatsapp.replace(/\D/g, "");
      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank");
    }
    setClientToConfirm(null);
  }

  const handleSaveAnamnese = async (id: string, anamnese: Anamnese) => {
    await onEdit(id, { 
      anamnese,
      aniversario: anamnese.dataNascimento
    });
  }

  return (
    <Card className="rounded-[2rem] md:rounded-3xl border-none shadow-2xl bg-card backdrop-blur-md overflow-hidden">
      <CardHeader className="p-4 md:p-8 space-y-4">
        <CardTitle className="text-2xl md:text-3xl font-headline text-gold-gradient flex items-center gap-2">
          <User className="text-primary" />
          Gerenciamento de Clientes
        </CardTitle>
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/40" size={18} />
            <Input 
              placeholder="Pesquisar por nome ou serviço..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-xl bg-background/50 border-border h-12"
              disabled={loading}
            />
          </div>
          {onAddNew && (
            <Button 
              onClick={() => onAddNew()} 
              disabled={loading}
              className="h-12 px-6 rounded-xl bg-gold-gradient text-primary-foreground font-bold shadow-lg hover:scale-105 transition-transform"
            >
              <PlusCircle className="mr-2" size={20} /> Novo Agendamento
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0 md:p-8">
        <div className="rounded-xl border border-border bg-background/30 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-foreground/5">
                <TableRow className="border-border">
                  <TableHead className="text-primary/60 font-bold">Status</TableHead>
                  <TableHead className="text-primary/60 font-bold">Nome</TableHead>
                  <TableHead className="text-primary/60 font-bold">Serviço</TableHead>
                  <TableHead className="text-primary/60 font-bold hidden md:table-cell">Aniversário</TableHead>
                  <TableHead className="text-primary/60 font-bold">Último</TableHead>
                  <TableHead className="text-right text-primary/60 font-bold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.length > 0 ? (
                  filteredClients.map((client) => {
                    const isAnamneseFilled = !!client.anamnese?.assinatura;
                    const isPending = client.confirmado === false;
                    const bday = parseBirthday(client.aniversario);
                    
                    return (
                      <TableRow key={client.id} className={cn("border-border hover:bg-foreground/5 transition-colors", isPending && "bg-primary/5")}>
                        <TableCell>
                          {isPending ? (
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-primary animate-instagram-pulse shadow-[0_0_8px_rgba(var(--primary),0.6)]" />
                              <span className="text-[10px] font-black text-primary uppercase tracking-tighter">Pendente</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <CheckCircle2 size={14} className="text-green-500" />
                              <span className="text-[10px] font-black text-green-500 uppercase tracking-tighter">OK</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-bold text-foreground">{client.nome}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm text-foreground/70">{client.servico}</span>
                            <span className="text-xs text-primary/50">R$ {client.valor || '0,00'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-2 text-xs text-foreground/60">
                            <Cake size={14} className="text-primary/40" />
                            {bday ? format(bday, "dd/MM", { locale: ptBR }) : "--/--"}
                          </div>
                        </TableCell>
                        <TableCell className="text-[10px] leading-tight text-foreground/40">{safeFormatDate(client.data)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 md:gap-2">
                            {isPending && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setClientToConfirm(client)}
                                disabled={loading}
                                className="h-8 rounded-full border-primary/40 text-primary hover:bg-primary/10 px-3 flex items-center gap-2 animate-in zoom-in duration-300"
                              >
                                <CheckCircle2 size={14} />
                                <span className="hidden sm:inline">Confirmar</span>
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => { setAnamneseClient(client); }}
                              disabled={loading}
                              className={cn(
                                "h-8 w-8 hover:bg-primary/10",
                                isAnamneseFilled ? "text-green-500" : "text-primary"
                              )}
                              title={isAnamneseFilled ? "Ficha Preenchida" : "Ficha Pendente"}
                            >
                              <ClipboardList size={16} />
                            </Button>
                            {client.whatsapp && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => { setReminderClient(client); }}
                                disabled={loading}
                                title="Enviar Lembrete"
                                className="h-8 w-8 text-green-500 hover:bg-green-500/10"
                              >
                                <Send size={16} />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => { setEditingClient(client); }}
                              disabled={loading}
                              className="h-8 w-8 text-primary hover:bg-primary/10"
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => { setDeleteConfirmId(client.id); }}
                              disabled={loading}
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              title="Excluir"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-primary/20 italic">
                      Nenhum cliente encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>

      <AnamneseModal 
        client={anamneseClient}
        isOpen={!!anamneseClient}
        onClose={() => setAnamneseClient(null)}
        onSave={handleSaveAnamnese}
      />

      <ReminderDialog 
        client={reminderClient}
        isOpen={!!reminderClient}
        onClose={() => setReminderClient(null)}
      />

      {/* Modal de Confirmação de Agendamento */}
      <Dialog open={!!clientToConfirm} onOpenChange={(open) => !open && setClientToConfirm(null)}>
        <DialogContent className="w-[95vw] sm:max-w-[420px] rounded-[2.5rem] bg-card border-border p-6 md:p-8 text-foreground shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-headline text-gold-gradient flex items-center gap-2">
              <CheckCircle2 className="text-green-500" size={28} />
              Confirmar?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-[10px] uppercase tracking-[0.2em] font-black pt-2">
              Confirmar agendamento de {clientToConfirm?.nome}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between bg-primary/5 p-4 rounded-2xl border border-primary/10 mt-4">
            <div className="space-y-0.5">
              <Label htmlFor="confirm-send-location" className="text-sm font-bold text-primary">Enviar Localização?</Label>
              <p className="text-[10px] text-muted-foreground uppercase font-black opacity-50">Link do Google Maps</p>
            </div>
            <Switch 
              id="confirm-send-location" 
              checked={confirmIncludeLocation} 
              onCheckedChange={setConfirmIncludeLocation}
            />
          </div>

          <div className="grid gap-3 py-6">
            <Button 
              onClick={() => clientToConfirm && handleConfirmBookingFinal(clientToConfirm)}
              className="h-14 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-bold text-lg shadow-lg flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={20} />
              Sim, Confirmar!
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setClientToConfirm(null)} 
              className="h-12 rounded-2xl text-muted-foreground font-bold hover:text-foreground"
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingClient} onOpenChange={(open) => { if (!open) { setEditingClient(null); } }}>
        <DialogContent className="w-[95vw] sm:max-w-[500px] rounded-[2rem] bg-background border-border p-4 md:p-8 max-h-[95vh] overflow-y-auto text-foreground">
          <DialogHeader>
            <DialogTitle className="text-3xl md:text-4xl font-headline text-gold-gradient">Editar Cliente</DialogTitle>
          </DialogHeader>
          {editingClient && (
            <div className="mt-4 md:mt-6">
              <AppointmentForm 
                initialData={editingClient} 
                loading={loading}
                onSubmit={async (data) => {
                  await onEdit(editingClient.id, data)
                  setEditingClient(null)
                }} 
                onCancel={() => setEditingClient(null)} 
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && !loading && setDeleteConfirmId(null)}>
        <AlertDialogContent className="rounded-[2rem] border-border bg-background p-8 text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-headline text-gold-gradient">Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Esta ação é irreversível. Todas as informações desta cliente e seus agendamentos serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex gap-3">
            <AlertDialogCancel className="flex-1 rounded-xl border-border bg-transparent text-foreground hover:bg-muted" disabled={loading}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={loading}
              className="flex-1 rounded-xl bg-destructive text-white hover:bg-destructive/90 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

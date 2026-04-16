'use server';

import { getTelegramToken } from '@/lib/api';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Função central para notificações Telegram (PROMPT CIRÚRGICO)
 */
export async function sendTelegramNotification({ 
  tipo, 
  cliente, 
  antes, 
  depois,
  userId 
}: { 
  tipo: 'Novo' | 'Alterado' | 'Removido' | 'Confirmado', 
  cliente: any, 
  antes?: any, 
  depois?: any,
  userId?: string 
}) {
  const botToken = await getTelegramToken(userId);
  if (!botToken) return;

  // Busca dados do estúdio e destinatários
  const { data: configData } = await supabaseAdmin.from('configuracoes').select('*').eq('user_id', userId);
  const { data: profile } = await supabaseAdmin.from('perfis').select('nome_exibicao').eq('id', userId).maybeSingle();
  
  const studioName = profile?.nome_exibicao || "I Lash Studio";
  const allRecipients = configData ? configData.map((item: any) => ({ id: item.id, nome: item.nome, chatID: item.valor })) : [];
  
  const SYSTEM_KEYS = ['SYSTEM_TOKEN', 'SUMMARY_STATE', 'MAIN_API_URL', 'WEBHOOK_STATE', 'WORKING_HOURS', 'VACATION_MODE', 'TELEGRAM_CONFIG', 'TECHNIQUES', 'PERFIL', 'FONT_FAMILY', 'CUSTOM_MESSAGES'];
  const recipients = allRecipients.filter(r => !SYSTEM_KEYS.includes(r.nome) && r.chatID);

  if (recipients.length === 0) return;

  // Formatação de data/hora
  const formatDateTime = (iso?: string) => {
    if (!iso) return '---';
    try {
      const date = parseISO(iso);
      return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch { return iso; }
  };

  const actionTitle = {
    'Novo': '✨ Agendamento Novo! ✨',
    'Alterado': '🔄 Agendamento Alterado! 🔄',
    'Removido': '🗑️ Agendamento Cancelado! 🗑️',
    'Confirmado': '✅ Agendamento Confirmado! ✅'
  }[tipo] || '🔔 Notificação 🔔';

  const formatCurrency = (val: any) => {
    if (!val) return 'R$ 0,00';
    return `R$ ${val.toString().replace('.', ',')}`;
  };

  let message = `${actionTitle}\n\n`;
  message += `🏢 <b>Studio:</b> ${studioName}\n\n`;

  // Se for alteração, mostra o diferencial de forma curta no topo
  if (tipo === 'Alterado' && antes && depois) {
    if (antes.data !== depois.data) {
      message += `🕒 <b>Troca de Horário:</b>\nDe: ${formatDateTime(antes.data)}\nPara: ${formatDateTime(depois.data)}\n\n`;
    }
  }

  const info = depois || cliente;
  message += `👤 <b>Cliente:</b> ${info.nome}\n`;
  message += `📌 <b>Status:</b> ${info.confirmado ? 'Confirmado' : 'Pendente'}\n`;
  message += `📅 <b>Data/Hora:</b> ${formatDateTime(info.data)}\n`;
  message += `🎨 <b>Serviço:</b> ${info.servico}\n`;
  message += `🔸 <b>Tipo:</b> ${info.tipo}\n`;
  message += `💰 <b>Valor Base:</b> ${formatCurrency(info.valor)}\n`;
  message += `📱 <b>WhatsApp:</b> ${info.whatsapp || '---'}\n`;
  
  if (info.servicosAdicionais && info.servicosAdicionais.length > 0) {
    const extras = info.servicosAdicionais.map((s: any) => `• ${s.nome} (${formatCurrency(s.valor)})`).join('\n');
    message += `\n✨ <b>Adicionais:</b>\n${extras}\n`;
  }
  
  if (info.observacoes) {
    message += `📝 <b>Obs:</b> ${info.observacoes}\n`;
  }

  message += `\n⏰ <b>Registro:</b> ${format(new Date(), "dd/MM/yyyy HH:mm")}`;

  for (const recipient of recipients) {
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: recipient.chatID,
          text: message,
          parse_mode: 'HTML',
        }),
      });
    } catch (error) {
      console.error(`Erro ao notificar admin ${recipient.nome}:`, error);
    }
  }
}

/**
 * Legado: Mantido para compatibilidade enquanto migramos triggers
 */
export async function notifyAppointmentChange(bookingData: any, changeType: 'Novo' | 'Alterado', userId?: string) {
  return sendTelegramNotification({ 
    tipo: changeType, 
    cliente: bookingData, 
    userId 
  });
}

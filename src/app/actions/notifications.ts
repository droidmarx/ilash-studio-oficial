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
  
  const SYSTEM_KEYS = ['SYSTEM_TOKEN', 'SUMMARY_STATE', 'MAIN_API_URL', 'WEBHOOK_STATE', 'WORKING_HOURS', 'VACATION_MODE', 'TELEGRAM_CONFIG', 'TECHNIQUES', 'PERFIL'];
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

  const actionEmoji = {
    'Novo': '✨',
    'Alterado': '🔄',
    'Removido': '🗑️',
    'Confirmado': '✅'
  }[tipo] || '🔔';

  let message = `👤 <b>${studioName}</b>\n\n`;
  message += `${actionEmoji} <b>Ação:</b> Cliente ${tipo.toLowerCase()}\n`;
  message += `👥 <b>Cliente:</b> ${cliente.nome}\n\n`;

  if (tipo === 'Alterado' && antes && depois) {
    if (antes.data !== depois.data) {
      message += `🕒 <b>Antes:</b> ${formatDateTime(antes.data)}\n`;
      message += `🕒 <b>Depois:</b> ${formatDateTime(depois.data)}\n\n`;
    }
    if (antes.servico !== depois.servico) {
      message += `🎨 <b>Serviço anterior:</b> ${antes.servico}\n`;
      message += `🎨 <b>Novo serviço:</b> ${depois.servico}\n\n`;
    }
  } else {
    message += `📅 <b>Data/Hora:</b> ${formatDateTime(cliente.data)}\n`;
    message += `🎨 <b>Serviço:</b> ${cliente.servico}\n`;
  }

  message += `\n⏰ <b>Data:</b> ${format(new Date(), "dd/MM/yyyy HH:mm")}`;

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

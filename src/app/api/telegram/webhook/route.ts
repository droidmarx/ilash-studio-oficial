
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getClients } from '@/lib/api';
import { 
  parseISO, parse, isValid, isSameDay, subHours, format, 
  isSameMonth, startOfWeek, endOfWeek, isWithinInterval, addMonths
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

// Identifica qual usuário enviou o comando pelo chatId dele
async function getUserIdByChatId(chatId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('configuracoes')
    .select('user_id')
    .eq('valor', String(chatId))
    .neq('nome', 'SYSTEM_TOKEN')
    .neq('nome', 'WORKING_HOURS')
    .neq('nome', 'VACATION_MODE')
    .neq('nome', 'TELEGRAM_CONFIG')
    .neq('nome', 'TECHNIQUES')
    .neq('nome', 'WEBHOOK_STATE')
    .neq('nome', 'SUMMARY_STATE')
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data.user_id;
}

export async function POST(request: Request) {
  try {
    if (!BOT_TOKEN) {
      console.error('[Webhook] TELEGRAM_BOT_TOKEN não configurado no servidor.');
      return NextResponse.json({ ok: true });
    }

    const body = await request.json();

    if (!body.message || !body.message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = String(body.message.chat.id);
    const text = body.message.text.toLowerCase();

    // Identifica o estúdio pelo chat_id de quem enviou
    const userId = await getUserIdByChatId(chatId);

    if (!userId) {
      // Chat ID não está cadastrado em nenhum estúdio
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `⚠️ <b>Chat ID não reconhecido!</b>\n\nSeu Chat ID (<code>${chatId}</code>) não está cadastrado em nenhum estúdio.\n\nPara usar os comandos, cadastre este ID nas configurações do seu estúdio.`,
          parse_mode: 'HTML'
        }),
      });
      return NextResponse.json({ ok: true });
    }

    const clients = await getClients(userId);
    const nowBrasilia = subHours(new Date(), 3);
    let responseMessage = "";

    const parseValue = (val?: string) => {
      if (!val) return 0;
      return parseFloat(val.replace(/[^\d,.-]/g, "").replace(".", "").replace(",", ".")) || 0;
    };

    const getStatusLabel = (confirmed?: boolean) =>
      confirmed === false ? "⏳ <b>(Pendente)</b>" : "✅ <b>(Confirmado)</b>";

    if (text.startsWith('/command1') || text.startsWith('/start')) {
      const items = clients.filter(c => {
        try {
          const d = c.data.includes('T') ? parseISO(c.data) : parse(c.data, 'dd/MM/yyyy HH:mm', new Date());
          return isValid(d) && isSameDay(d, nowBrasilia);
        } catch { return false; }
      }).sort((a, b) => {
        const da = a.data.includes('T') ? parseISO(a.data) : parse(a.data, 'dd/MM/yyyy HH:mm', new Date());
        const db = b.data.includes('T') ? parseISO(b.data) : parse(b.data, 'dd/MM/yyyy HH:mm', new Date());
        return da.getTime() - db.getTime();
      });

      if (items.length > 0) {
        const total = items.reduce((acc, c) => acc + parseValue(c.valor), 0);
        responseMessage = `✨ <b>Agenda VIP — Hoje (${format(nowBrasilia, 'dd/MM')})</b> ✨\n\n` +
          items.map(app => {
            const time = format(app.data.includes('T') ? parseISO(app.data) : parse(app.data, 'dd/MM/yyyy HH:mm', new Date()), 'HH:mm');
            return `${getStatusLabel(app.confirmado)}\n⏰ <b>${time}</b> — ${app.nome}\n🎨 ${app.servico}\n💰 R$ ${app.valor || '0,00'}`;
          }).join('\n\n') +
          `\n\n━━━━━━━━━━━━━━━\n💰 <b>TOTAL HOJE: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b>`;
      } else {
        responseMessage = `✨ <b>Olá!</b> ✨\n\nNenhum agendamento para hoje (${format(nowBrasilia, 'dd/MM')}).`;
      }
    } else if (text.startsWith('/command2')) {
      const items = clients.filter(c => {
        try {
          const d = c.data.includes('T') ? parseISO(c.data) : parse(c.data, 'dd/MM/yyyy HH:mm', new Date());
          return isValid(d) && isSameMonth(d, nowBrasilia);
        } catch { return false; }
      });
      const total = items.reduce((acc, c) => acc + parseValue(c.valor), 0);
      const monthName = format(nowBrasilia, 'MMMM', { locale: ptBR });
      responseMessage = items.length > 0
        ? `✨ <b>Agenda VIP — ${monthName}</b> ✨\n\n` +
          items.sort((a, b) => parseISO(a.data).getTime() - parseISO(b.data).getTime()).map(app => {
            const d = app.data.includes('T') ? parseISO(app.data) : parse(app.data, 'dd/MM/yyyy HH:mm', new Date());
            return `${getStatusLabel(app.confirmado)}\n📅 <b>${format(d, 'dd/MM (EEE)', { locale: ptBR })} às ${format(d, 'HH:mm')}</b>\n👤 ${app.nome}\n🎨 ${app.servico}\n💰 R$ ${app.valor || '0,00'}`;
          }).join('\n\n') +
          `\n\n━━━━━━━━━━━━━━━\n💰 <b>TOTAL MÊS: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b>`
        : `Nenhum agendamento para ${monthName}.`;
    } else if (text.startsWith('/command3')) {
      const weekStart = startOfWeek(nowBrasilia, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(nowBrasilia, { weekStartsOn: 0 });
      const items = clients.filter(c => {
        try {
          const d = c.data.includes('T') ? parseISO(c.data) : parse(c.data, 'dd/MM/yyyy HH:mm', new Date());
          return isValid(d) && isWithinInterval(d, { start: weekStart, end: weekEnd });
        } catch { return false; }
      });
      const total = items.reduce((acc, c) => acc + parseValue(c.valor), 0);
      responseMessage = items.length > 0
        ? `✨ <b>Agenda VIP — Esta Semana</b> ✨\n\n` +
          items.sort((a, b) => parseISO(a.data).getTime() - parseISO(b.data).getTime()).map(app => {
            const d = app.data.includes('T') ? parseISO(app.data) : parse(app.data, 'dd/MM/yyyy HH:mm', new Date());
            return `${getStatusLabel(app.confirmado)}\n📅 <b>${format(d, 'dd/MM (EEE)', { locale: ptBR })} às ${format(d, 'HH:mm')}</b>\n👤 ${app.nome}\n🎨 ${app.servico}\n💰 R$ ${app.valor || '0,00'}`;
          }).join('\n\n') +
          `\n\n━━━━━━━━━━━━━━━\n💰 <b>TOTAL SEMANA: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b>`
        : `Nenhum agendamento para esta semana.`;
    } else if (text.startsWith('/command4')) {
      const nextMonth = addMonths(nowBrasilia, 1);
      const items = clients.filter(c => {
        try {
          const d = c.data.includes('T') ? parseISO(c.data) : parse(c.data, 'dd/MM/yyyy HH:mm', new Date());
          return isValid(d) && isSameMonth(d, nextMonth);
        } catch { return false; }
      });
      const total = items.reduce((acc, c) => acc + parseValue(c.valor), 0);
      const monthName = format(nextMonth, 'MMMM', { locale: ptBR });
      responseMessage = items.length > 0
        ? `✨ <b>Agenda VIP — ${monthName} (Próx. Mês)</b> ✨\n\n` +
          items.sort((a, b) => parseISO(a.data).getTime() - parseISO(b.data).getTime()).map(app => {
            const d = app.data.includes('T') ? parseISO(app.data) : parse(app.data, 'dd/MM/yyyy HH:mm', new Date());
            return `${getStatusLabel(app.confirmado)}\n📅 <b>${format(d, 'dd/MM (EEE)', { locale: ptBR })} às ${format(d, 'HH:mm')}</b>\n👤 ${app.nome}\n🎨 ${app.servico}\n💰 R$ ${app.valor || '0,00'}`;
          }).join('\n\n') +
          `\n\n━━━━━━━━━━━━━━━\n💰 <b>TOTAL PREVISTO: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b>`
        : `Nenhum agendamento para ${monthName}.`;
    } else if (text.startsWith('/meuid')) {
      // Comando de ajuda para o usuário descobrir seu chat_id
      responseMessage = `🆔 <b>Seu Chat ID é:</b>\n\n<code>${chatId}</code>\n\nCopie este número e cole no campo "Meu Chat ID" nas configurações do seu estúdio.`;
    }

    if (responseMessage) {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: responseMessage, parse_mode: 'HTML' }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Telegram Webhook] Erro fatal:', error);
    return NextResponse.json({ ok: true });
  }
}

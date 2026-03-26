
import { NextResponse } from 'next/server';
import { getClients, getTelegramToken } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { 
  parseISO, 
  parse, 
  isValid, 
  isSameDay, 
  subHours, 
  format, 
  isSameMonth, 
  startOfWeek, 
  endOfWeek, 
  isWithinInterval,
  addMonths
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

// Busca o userId pelo token do bot recebido na mensagem
async function getUserIdByToken(token: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('configuracoes')
    .select('user_id')
    .eq('nome', 'SYSTEM_TOKEN')
    .eq('valor', token)
    .maybeSingle();
  
  if (error || !data) return null;
  return data.user_id;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.message || !body.message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = body.message.chat.id.toString();
    const text = body.message.text.toLowerCase();

    // Comando de diagnóstico universal (independente de cadastro)
    if (text === '/chatid' || text === '/myid') {
      const bt = await getTelegramToken();
      if (bt) {
        await fetch(`https://api.telegram.org/bot${bt}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `🔎 <b>Seu Chat ID é:</b>\n\n<code>${chatId}</code>\n\nCopie este número exato e cole na lista de destinatários nas configurações do seu painel!`,
            parse_mode: 'HTML',
          }),
        });
      }
      return NextResponse.json({ ok: true });
    }

    // 1. Identifica o userId baseado no chat_id cadastrado em configuracoes
    const { data: configData, error: configError } = await supabase
      .from('configuracoes')
      .select('user_id')
      .eq('valor', chatId)
      .limit(1)
      .maybeSingle();

    if (!configData || configError) {
      console.warn('[Telegram Webhook] Chat ID não identificado:', chatId);
      // Opcional: Responder ao usuário informando que o chat não está cadastrado
      return NextResponse.json({ ok: true });
    }

    const userId = configData.user_id;

    // 2. Busca o token global do bot
    const botToken = await getTelegramToken();

    if (!botToken) {
      console.error('[Telegram Webhook] Bot Token global não configurado');
      return NextResponse.json({ ok: true });
    }


    const clients = await getClients(userId ?? undefined);
    const nowBrasilia = subHours(new Date(), 3);

    let responseMessage = "";

    const parseValue = (val?: string) => {
      if (!val) return 0;
      return parseFloat(val.replace(/[^\d,.-]/g, "").replace(".", "").replace(",", ".")) || 0;
    };

    const getStatusLabel = (confirmed?: boolean) => 
      confirmed === false ? "⏳ <b>(Pendente)</b>" : "✅ <b>(Confirmado)</b>";

    // LÓGICA 1: /command1 ou /start (Agenda de HOJE)
    if (text.startsWith('/command1') || text.startsWith('/start')) {
      const todayAppointments = clients.filter(client => {
        try {
          const appDate = client.data.includes('T') ? parseISO(client.data) : parse(client.data, 'dd/MM/yyyy HH:mm', new Date());
          return isValid(appDate) && isSameDay(appDate, nowBrasilia);
        } catch { return false; }
      }).sort((a, b) => {
        const da = a.data.includes('T') ? parseISO(a.data) : parse(a.data, 'dd/MM/yyyy HH:mm', new Date());
        const db = b.data.includes('T') ? parseISO(b.data) : parse(b.data, 'dd/MM/yyyy HH:mm', new Date());
        return da.getTime() - db.getTime();
      });

      if (todayAppointments.length > 0) {
        const total = todayAppointments.reduce((acc, curr) => acc + parseValue(curr.valor), 0);
        responseMessage = `✨ <b>Agenda VIP - Hoje (${format(nowBrasilia, 'dd/MM')})</b> ✨\n\n` +
          todayAppointments.map(app => {
            const time = format(app.data.includes('T') ? parseISO(app.data) : parse(app.data, 'dd/MM/yyyy HH:mm', new Date()), 'HH:mm');
            const status = getStatusLabel(app.confirmado);
            return `${status}\n⏰ <b>${time}</b> - ${app.nome}\n🎨 ${app.servico}\n💰 R$ ${app.valor || '0,00'}`;
          }).join('\n\n') +
          `\n\n━━━━━━━━━━━━━━━\n💰 <b>TOTAL HOJE: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b>\n\n🚀 <i>Gerenciado via I Lash Studio</i>`;
      } else {
        responseMessage = `✨ <b>Olá!</b> ✨\n\nVocê não tem agendamentos para hoje (${format(nowBrasilia, 'dd/MM')}).`;
      }
    } 
    // LÓGICA 2: /command2 (Agenda do MÊS ATUAL)
    else if (text.startsWith('/command2')) {
      const monthAppointments = clients.filter(client => {
        try {
          const appDate = client.data.includes('T') ? parseISO(client.data) : parse(client.data, 'dd/MM/yyyy HH:mm', new Date());
          return isValid(appDate) && isSameMonth(appDate, nowBrasilia);
        } catch { return false; }
      }).sort((a, b) => {
        const da = a.data.includes('T') ? parseISO(a.data) : parse(a.data, 'dd/MM/yyyy HH:mm', new Date());
        const db = b.data.includes('T') ? parseISO(b.data) : parse(b.data, 'dd/MM/yyyy HH:mm', new Date());
        return da.getTime() - db.getTime();
      });

      if (monthAppointments.length > 0) {
        const total = monthAppointments.reduce((acc, curr) => acc + parseValue(curr.valor), 0);
        const monthName = format(nowBrasilia, 'MMMM', { locale: ptBR });
        responseMessage = `✨ <b>Agenda VIP - ${monthName}</b> ✨\n\n` +
          monthAppointments.map(app => {
            const date = app.data.includes('T') ? parseISO(app.data) : parse(app.data, 'dd/MM/yyyy HH:mm', new Date());
            const dateStr = format(date, 'dd/MM (EEE)', { locale: ptBR });
            const time = format(date, 'HH:mm');
            const status = getStatusLabel(app.confirmado);
            return `${status}\n📅 <b>${dateStr} às ${time}</b>\n👤 ${app.nome}\n🎨 ${app.servico}\n💰 R$ ${app.valor || '0,00'}`;
          }).join('\n\n') +
          `\n\n━━━━━━━━━━━━━━━\n💰 <b>TOTAL MÊS: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b>`;
      } else {
        responseMessage = `✨ <b>Olá!</b> ✨\n\nNão há agendamentos para o mês de ${format(nowBrasilia, 'MMMM', { locale: ptBR })}.`;
      }
    }
    // LÓGICA 3: /command3 (Agenda da SEMANA - Domingo a Sábado)
    else if (text.startsWith('/command3')) {
      const weekStart = startOfWeek(nowBrasilia, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(nowBrasilia, { weekStartsOn: 0 });
      
      const weekAppointments = clients.filter(client => {
        try {
          const appDate = client.data.includes('T') ? parseISO(client.data) : parse(client.data, 'dd/MM/yyyy HH:mm', new Date());
          return isValid(appDate) && isWithinInterval(appDate, { start: weekStart, end: weekEnd });
        } catch { return false; }
      }).sort((a, b) => {
        const da = a.data.includes('T') ? parseISO(a.data) : parse(a.data, 'dd/MM/yyyy HH:mm', new Date());
        const db = b.data.includes('T') ? parseISO(b.data) : parse(b.data, 'dd/MM/yyyy HH:mm', new Date());
        return da.getTime() - db.getTime();
      });

      if (weekAppointments.length > 0) {
        const total = weekAppointments.reduce((acc, curr) => acc + parseValue(curr.valor), 0);
        responseMessage = `✨ <b>Agenda VIP - Esta Semana</b> ✨\n\n` +
          weekAppointments.map(app => {
            const date = app.data.includes('T') ? parseISO(app.data) : parse(app.data, 'dd/MM/yyyy HH:mm', new Date());
            const dateStr = format(date, 'dd/MM (EEE)', { locale: ptBR });
            const time = format(date, 'HH:mm');
            const status = getStatusLabel(app.confirmado);
            return `${status}\n📅 <b>${dateStr} às ${time}</b>\n👤 ${app.nome}\n🎨 ${app.servico}\n💰 R$ ${app.valor || '0,00'}`;
          }).join('\n\n') +
          `\n\n━━━━━━━━━━━━━━━\n💰 <b>TOTAL SEMANA: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b>`;
      } else {
        responseMessage = `✨ <b>Olá!</b> ✨\n\nNão há agendamentos para esta semana (domingo a sábado).`;
      }
    }
    // LÓGICA 4: /command4 (Agenda do PRÓXIMO MÊS)
    else if (text.startsWith('/command4')) {
      const nextMonth = addMonths(nowBrasilia, 1);
      const nextMonthAppointments = clients.filter(client => {
        try {
          const appDate = client.data.includes('T') ? parseISO(client.data) : parse(client.data, 'dd/MM/yyyy HH:mm', new Date());
          return isValid(appDate) && isSameMonth(appDate, nextMonth);
        } catch { return false; }
      }).sort((a, b) => {
        const da = a.data.includes('T') ? parseISO(a.data) : parse(a.data, 'dd/MM/yyyy HH:mm', new Date());
        const db = b.data.includes('T') ? parseISO(b.data) : parse(b.data, 'dd/MM/yyyy HH:mm', new Date());
        return da.getTime() - db.getTime();
      });

      if (nextMonthAppointments.length > 0) {
        const total = nextMonthAppointments.reduce((acc, curr) => acc + parseValue(curr.valor), 0);
        const monthName = format(nextMonth, 'MMMM', { locale: ptBR });
        responseMessage = `✨ <b>Agenda VIP - ${monthName} (Próx. Mês)</b> ✨\n\n` +
          nextMonthAppointments.map(app => {
            const date = app.data.includes('T') ? parseISO(app.data) : parse(app.data, 'dd/MM/yyyy HH:mm', new Date());
            const dateStr = format(date, 'dd/MM (EEE)', { locale: ptBR });
            const time = format(date, 'HH:mm');
            const status = getStatusLabel(app.confirmado);
            return `${status}\n📅 <b>${dateStr} às ${time}</b>\n👤 ${app.nome}\n🎨 ${app.servico}\n💰 R$ ${app.valor || '0,00'}`;
          }).join('\n\n') +
          `\n\n━━━━━━━━━━━━━━━\n💰 <b>TOTAL PREVISTO: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b>`;
      } else {
        responseMessage = `✨ <b>Olá!</b> ✨\n\nNão há agendamentos para o próximo mês (${format(nextMonth, 'MMMM', { locale: ptBR })}).`;
      }
    }

    if (responseMessage) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: responseMessage,
          parse_mode: 'HTML',
        }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Telegram Webhook] Erro fatal:', error);
    return NextResponse.json({ ok: true });
  }
}


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
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get('userId');

    const body = await request.json();
    
    if (!body.message || !body.message.text) {
      return NextResponse.json({ ok: true });
    }

    // Se não tem userId na URL, tenta descobrir pelo token armazenado
    if (!userId) {
      // Extrai o token da URL do webhook (não disponível aqui, então busca de outra forma)
      // Loga o erro mas continua tentando
      console.warn('[Telegram Webhook] userId não encontrado na URL. Tentando identificar pelo banco de dados...');
      
      // Busca todos os tokens e tenta identificar qual bot recebeu a mensagem
      // usando o bot_id do from field
      const botId = body.message.from?.is_bot ? null : null; // não está disponível diretamente
      
      // Fallback: busca o primeiro usuário com token cadastrado (funciona para instância única)
      const { data: tokenData } = await supabase
        .from('configuracoes')
        .select('user_id')
        .eq('nome', 'SYSTEM_TOKEN')
        .limit(1)
        .maybeSingle();
      
      if (tokenData?.user_id) {
        userId = tokenData.user_id;
        console.log('[Telegram Webhook] userId identificado:', userId);
      } else {
        console.error('[Telegram Webhook] Nenhum token cadastrado no banco');
        return NextResponse.json({ ok: true });
      }
    }

    const botToken = await getTelegramToken(userId ?? undefined);

    if (!botToken) {
      console.error('[Telegram Webhook] Token não encontrado para userId:', userId);
      return NextResponse.json({ ok: true });
    }

    const chatId = body.message.chat.id;
    const text = body.message.text.toLowerCase();

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

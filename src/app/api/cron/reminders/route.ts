import { NextResponse } from 'next/server';
import { getTelegramToken, defaultTelegramSettings } from '@/lib/api';
import { addHours, subMinutes, addMinutes, parseISO, isWithinInterval, format, parse, isValid, subHours, isSameDay } from 'date-fns';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  console.log('[Cron] Verificação de rotina iniciada.');

  const authHeader = request.headers.get('authorization');
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET) {
    console.error('[Cron] ERRO: Variável CRON_SECRET não encontrada.');
    return NextResponse.json({ error: 'CRON_SECRET não configurado' }, { status: 500 });
  }

  if (authHeader !== expectedToken) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const botToken = await getTelegramToken();
    if (!botToken) {
      return NextResponse.json({ message: 'Bot Token global não configurado' });
    }

    // Define mapper para manter localmente
    const mapToClient = (db: any) => ({
      id: db.id,
      nome: db.nome,
      data: db.data,
      servico: db.servico,
      tipo: db.tipo,
      valor: db.valor,
      confirmado: db.confirmado,
      reminderSent: db.reminder_sent,
      user_id: db.user_id
    });

    // 1. Busca todos os agendamentos via Admin
    const { data: clientsData, error: clientsError } = await supabaseAdmin.from('agendamentos').select('*');
    if (clientsError) {
      return NextResponse.json({ error: 'Erro ao buscar clientes' }, { status: 500 });
    }
    const allClients = clientsData.map(mapToClient);
    
    // 2. Busca todas as configurações via Admin
    const { data: allConfigs, error: configsError } = await supabaseAdmin
      .from('configuracoes')
      .select('*');

    if (configsError || !allConfigs) {
      return NextResponse.json({ error: 'Erro ao buscar configurações' }, { status: 500 });
    }

    // Agrupa configurações por user_id
    const configsByUser = allConfigs.reduce((acc: any, curr: any) => {
      if (!acc[curr.user_id]) acc[curr.user_id] = [];
      acc[curr.user_id].push(curr);
      return acc;
    }, {});

    const nowUTC = new Date();
    const nowBrasilia = subHours(nowUTC, 3);
    const todayStr = format(nowBrasilia, 'yyyy-MM-dd');
    const currentHour = nowBrasilia.getHours();

    // 3. Itera sobre cada usuário/estúdio
    for (const userId in configsByUser) {
      const userConfigs = configsByUser[userId];
      const adminRecipients = userConfigs.filter((r: any) => 
        !['SYSTEM_TOKEN', 'SUMMARY_STATE', 'MAIN_API_URL', 'WEBHOOK_STATE', 'WORKING_HOURS', 'VACATION_MODE', 'TELEGRAM_CONFIG', 'TECHNIQUES', 'PERFIL'].includes(r.nome) && r.valor
      );

      if (adminRecipients.length === 0) continue;

      const rawTelegramConfig = userConfigs.find((r: any) => r.nome === 'TELEGRAM_CONFIG')?.valor;
      const telegramConfig = rawTelegramConfig ? JSON.parse(rawTelegramConfig) : defaultTelegramSettings;

      const userClients = allClients.filter(c => (c as any).user_id === userId);

      // --- LÓGICA 1: RESUMO DIÁRIO DAS 8H ---
      if (telegramConfig.dailySummary && currentHour === 8) {
        const lastSentDate = userConfigs.find((r: any) => r.nome === 'SUMMARY_STATE')?.valor;
        
        if (lastSentDate !== todayStr) {
          const todayAppointments = userClients.filter(client => {
            try {
              const appDate = client.data.includes('T') ? parseISO(client.data) : parse(client.data, 'dd/MM/yyyy HH:mm', new Date());
              return isValid(appDate) && isSameDay(appDate, nowBrasilia);
            } catch { return false; }
          }).sort((a, b) => {
            const da = a.data.includes('T') ? parseISO(a.data) : parse(a.data, 'dd/MM/yyyy HH:mm', new Date());
            const db = b.data.includes('T') ? parseISO(b.data) : parse(b.data, 'dd/MM/yyyy HH:mm', new Date());
            return da.getTime() - db.getTime();
          });

          let summaryMessage = "";
          if (todayAppointments.length > 0) {
            summaryMessage = `✨ <b>Bom dia! Agenda de Hoje</b> ✨\n\n` +
              todayAppointments.map(app => {
                const appDate = app.data.includes('T') ? parseISO(app.data) : parse(app.data, 'dd/MM/yyyy HH:mm', new Date());
                const status = app.confirmado === false ? "⏳ <b>(Pendente)</b>" : "✅ <b>(Confirmado)</b>";
                return `${status}\n⏰ <b>${format(appDate, 'HH:mm')}</b> - ${app.nome}\n🎨 ${app.servico}`;
              }).join('\n\n') +
              `\n\n🚀 <i>Tenha um ótimo dia de trabalho!</i>`;
          } else {
            summaryMessage = `✨ <b>Bom dia!</b> ✨\n\nVocê não tem agendamentos para hoje.\n💖 <i>Que tal aproveitar para organizar o studio?</i>`;
          }

          for (const admin of adminRecipients) {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: admin.valor, text: summaryMessage, parse_mode: 'HTML' }),
            });
          }
          
          // Atualiza SUMMARY_STATE para este usuário
          await supabaseAdmin
            .from('configuracoes')
            .upsert({ user_id: userId, nome: 'SUMMARY_STATE', valor: todayStr }, { onConflict: 'user_id, nome' });
        }
      }

      // --- LÓGICA 2: LEMBRETES DE 2 HORAS ---
      if (telegramConfig.reminder2h) {
        const targetTime = addHours(nowBrasilia, 2);
        const windowStart = subMinutes(targetTime, 10);
        const windowEnd = addMinutes(targetTime, 10);

        const upcoming = userClients.filter(c => {
          if (c.confirmado === false || c.reminderSent === true) return false;
          try {
            const appDate = c.data.includes('T') ? parseISO(c.data) : parse(c.data, 'dd/MM/yyyy HH:mm', new Date());
            return isValid(appDate) && isWithinInterval(appDate, { start: windowStart, end: windowEnd });
          } catch { return false; }
        });

        for (const app of upcoming) {
          const appDate = app.data.includes('T') ? parseISO(app.data) : parse(app.data, 'dd/MM/yyyy HH:mm', new Date());
          const msg = `⏰ <b>Lembrete VIP I Lash Studio</b>\n\n👤 <b>Cliente:</b> ${app.nome}\n🎨 <b>Serviço:</b> ${app.servico}\n⏰ <b>Horário:</b> ${format(appDate, 'HH:mm')}\n\n🚀 <i>Sua cliente chega em breve!</i>`;

          let sent = false;
          for (const admin of adminRecipients) {
            const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: admin.valor, text: msg, parse_mode: 'HTML' }),
            });
            if (res.ok) sent = true;
          }
          if (sent) {
            await supabaseAdmin.from('agendamentos').update({ reminder_sent: true }).eq('id', app.id);
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Cron] ERRO:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

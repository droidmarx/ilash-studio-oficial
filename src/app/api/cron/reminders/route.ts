import { NextResponse } from 'next/server';
import { getTelegramToken, defaultTelegramSettings } from '@/lib/api';
import { addHours, subMinutes, addMinutes, parseISO, isWithinInterval, format, parse, isValid, subHours, isSameDay } from 'date-fns';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { toZonedTime } from 'date-fns-tz';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;
  const logs: string[] = [];
  const timeZone = 'America/Sao_Paulo';

  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET não configurado' }, { status: 500 });
  }

  if (authHeader !== expectedToken) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const startTime = new Date().toLocaleString("pt-BR", { timeZone });
    logs.push(`Iniciado em: ${startTime}`);

    const botToken = await getTelegramToken();
    if (!botToken) {
      throw new Error('Bot Token global não configurado');
    }

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

    const { data: clientsData, error: clientsError } = await supabaseAdmin.from('agendamentos').select('*');
    if (clientsError) throw new Error('Erro ao buscar clientes');
    const allClients = clientsData.map(mapToClient);
    
    const { data: allConfigs, error: configsError } = await supabaseAdmin.from('configuracoes').select('*');
    if (configsError || !allConfigs) throw new Error('Erro ao buscar configurações');

    const configsByUser = allConfigs.reduce((acc: any, curr: any) => {
      if (!acc[curr.user_id]) acc[curr.user_id] = [];
      acc[curr.user_id].push(curr);
      return acc;
    }, {});

    const nowBrasilia = toZonedTime(new Date(), timeZone);
    const todayStr = format(nowBrasilia, 'yyyy-MM-dd');
    const currentHour = nowBrasilia.getHours();

    for (const userId in configsByUser) {
      const userConfigs = configsByUser[userId];
      const adminRecipients = userConfigs.filter((r: any) => 
        !['SYSTEM_TOKEN', 'SUMMARY_STATE', 'MAIN_API_URL', 'WEBHOOK_STATE', 'WORKING_HOURS', 'VACATION_MODE', 'TELEGRAM_CONFIG', 'TECHNIQUES', 'PERFIL'].includes(r.nome) && r.valor
      );

      if (adminRecipients.length === 0) continue;

      const rawTelegramConfig = userConfigs.find((r: any) => r.nome === 'TELEGRAM_CONFIG')?.valor;
      const telegramConfig = rawTelegramConfig ? JSON.parse(rawTelegramConfig) : defaultTelegramSettings;
      const userClients = allClients.filter(c => (c as any).user_id === userId);

      if (telegramConfig.dailySummary && currentHour === 8) {
        const lastSentDate = userConfigs.find((r: any) => r.nome === 'SUMMARY_STATE')?.valor;
        if (lastSentDate !== todayStr) {
          const todayAppointments = userClients.filter(client => {
            try {
              const appDate = client.data.includes('T') ? parseISO(client.data) : parse(client.data, 'dd/MM/yyyy HH:mm', new Date());
              return isValid(appDate) && isSameDay(appDate, nowBrasilia);
            } catch { return false; }
          });

          let summaryMessage = todayAppointments.length > 0 
            ? `✨ <b>Bom dia! Agenda de Hoje</b> ✨\n\n` + todayAppointments.map(app => {
                const appDate = app.data.includes('T') ? parseISO(app.data) : parse(app.data, 'dd/MM/yyyy HH:mm', new Date());
                return `${app.confirmado === false ? "⏳" : "✅"} <b>${format(appDate, 'HH:mm')}</b> - ${app.nome}`;
              }).join('\n')
            : `✨ <b>Bom dia!</b> ✨\n\nSem agendamentos hoje.`;

          for (const admin of adminRecipients) {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: admin.valor, text: summaryMessage, parse_mode: 'HTML' }),
            });
          }
          await supabaseAdmin.from('configuracoes').upsert({ user_id: userId, nome: 'SUMMARY_STATE', valor: todayStr }, { onConflict: 'user_id, nome' });
        }
      }

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
          const msg = `⏰ <b>Lembrete:</b> ${app.nome} às ${format(parseISO(app.data), 'HH:mm')}`;
          for (const admin of adminRecipients) {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: admin.valor, text: msg, parse_mode: 'HTML' }),
            });
          }
          await supabaseAdmin.from('agendamentos').update({ reminder_sent: true }).eq('id', app.id);
        }
      }
    }

    await supabaseAdmin.from('cron_logs').insert({ status: 'success', logs: logs.join('\n') });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Cron] ERRO:', error);
    const botToken = await getTelegramToken();
    if (botToken) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: process.env.ADMIN_CHAT_ID, text: `⚠️ <b>ERRO NO CRON:</b> ${error.message}`, parse_mode: 'HTML' }),
      });
    }
    await supabaseAdmin.from('cron_logs').insert({ status: 'error', logs: error.message });
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

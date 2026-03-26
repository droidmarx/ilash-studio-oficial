import { NextResponse } from 'next/server';
import { getRecipients } from '@/lib/api';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!BOT_TOKEN) {
      return NextResponse.json({ 
        error: 'Bot não configurado no servidor. Adicione a variável TELEGRAM_BOT_TOKEN no Vercel.' 
      }, { status: 500 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'userId não fornecido' }, { status: 400 });
    }

    // Busca os Chat IDs dos destinatários deste usuário
    const recipients = await getRecipients(userId);
    const SYSTEM_KEYS = ['SYSTEM_TOKEN', 'SUMMARY_STATE', 'MAIN_API_URL', 'WEBHOOK_STATE', 
      'WORKING_HOURS', 'VACATION_MODE', 'TELEGRAM_CONFIG', 'TECHNIQUES', 'PERFIL'];
    const adminRecipients = recipients.filter(r => !SYSTEM_KEYS.includes(r.nome) && r.chatID?.trim());

    if (adminRecipients.length === 0) {
      return NextResponse.json({ 
        error: 'Nenhum Chat ID cadastrado ainda. Adicione seu Chat ID nas configurações e salve antes de testar.' 
      }, { status: 400 });
    }

    // Valida o bot global
    const meRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    const meData = await meRes.json();

    if (!meRes.ok || !meData.ok) {
      return NextResponse.json({ 
        error: `Token do bot inválido no servidor. Verifique a variável TELEGRAM_BOT_TOKEN no Vercel.` 
      }, { status: 500 });
    }

    let successCount = 0;
    const errors: string[] = [];

    for (const admin of adminRecipients) {
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: admin.chatID,
          text: `✅ <b>Conexão Estabelecida!</b>\n\nSeu Chat ID está funcionando. Para consultar sua agenda, envie os comandos:\n\n📅 /command1 — Agenda de Hoje\n📆 /command2 — Agenda do Mês\n🗓 /command3 — Agenda da Semana\n✨ /command4 — Próximo Mês`,
          parse_mode: 'HTML'
        }),
      });

      if (res.ok) {
        successCount++;
      } else {
        const errData = await res.json();
        errors.push(`Chat ID ${admin.chatID} (${admin.nome}): ${errData.description}`);
      }
    }

    if (successCount > 0) {
      return NextResponse.json({ success: true, count: successCount, botName: meData.result.username });
    } else {
      return NextResponse.json({ 
        error: `Falha ao enviar: ${errors.join(' | ')}` 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[Telegram Test] Erro:', error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}

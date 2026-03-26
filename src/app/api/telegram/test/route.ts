import { NextResponse } from 'next/server';
import { getRecipients } from '@/lib/api';

export async function POST(request: Request) {
  try {
    const { token, userId } = await request.json();
    
    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 400 });
    }

    const recipients = await getRecipients(userId);
    const adminRecipients = recipients.filter(r => 
      !['SYSTEM_TOKEN', 'SUMMARY_STATE', 'MAIN_API_URL', 'WEBHOOK_STATE', 'WORKING_HOURS', 'VACATION_MODE', 'TELEGRAM_CONFIG', 'TECHNIQUES', 'PERFIL'].includes(r.nome) && r.chatID
    );

    if (adminRecipients.length === 0) {
      return NextResponse.json({ error: 'Nenhum administrador configurado para receber notificações.' }, { status: 400 });
    }

    let successCount = 0;
    for (const admin of adminRecipients) {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: admin.chatID,
          text: `✅ <b>Teste de Conexão Bem-Sucedido!</b>\n\nSeu robô está configurado e pronto para enviar notificações do I Lash Studio.`,
          parse_mode: 'HTML'
        }),
      });
      if (res.ok) successCount++;
    }

    if (successCount > 0) {
      return NextResponse.json({ success: true, count: successCount });
    } else {
      return NextResponse.json({ error: 'Falha ao enviar mensagens via Telegram API' }, { status: 500 });
    }

  } catch (error) {
    console.error('[Telegram Test] Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

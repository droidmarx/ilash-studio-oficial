import { NextResponse } from 'next/server';
import { getRecipients, getTelegramToken } from '@/lib/api';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    
    // O token agora é global
    const token = await getTelegramToken();
    
    if (!token) {
      return NextResponse.json({ error: 'Token global não configurado no servidor' }, { status: 500 });
    }

    // 1. Valida o token com a API do Telegram
    const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const meData = await meRes.json();

    if (!meRes.ok || !meData.ok) {
      return NextResponse.json(
        { error: `Token inválido. Resposta do Telegram: ${meData.description || 'Erro desconhecido'}` },
        { status: 400 }
      );
    }

    // 2. Busca destinatários configurados para este usuário
    const recipients = await getRecipients(userId);
    const SYSTEM_KEYS = ['SYSTEM_TOKEN', 'SUMMARY_STATE', 'MAIN_API_URL', 'WEBHOOK_STATE', 'WORKING_HOURS', 'VACATION_MODE', 'TELEGRAM_CONFIG', 'TECHNIQUES', 'PERFIL'];
    const adminRecipients = recipients.filter(r => !SYSTEM_KEYS.includes(r.nome) && r.chatID?.trim());

    if (adminRecipients.length === 0) {
      // Token está válido mas não há destinatários - retorna aviso útil
      return NextResponse.json({ 
        error: `Token válido! (Bot: @${meData.result.username})\nMas nenhum destinatário está cadastrado ainda. Adicione pelo menos um Chat ID na lista de destinatários e salve antes de testar.` 
      }, { status: 400 });
    }

    // 3. Envia mensagem de teste para cada destinatário
    let successCount = 0;
    const errors: string[] = [];

    for (const admin of adminRecipients) {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: admin.chatID,
          text: `✅ <b>Teste de Conexão Bem-Sucedido!</b>\n\nSeu robô <b>@${meData.result.username}</b> está configurado e pronto para enviar notificações.\n\n🤖 <i>Enviado via Ilash Studio</i>`,
          parse_mode: 'HTML'
        }),
      });
      
      if (res.ok) {
        successCount++;
      } else {
        const errData = await res.json();
        errors.push(`Erro para ${admin.nome} (ID: ${admin.chatID}): ${errData.description}`);
      }
    }

    if (successCount > 0) {
      return NextResponse.json({ success: true, count: successCount, botName: meData.result.username });
    } else {
      return NextResponse.json({ error: `Token válido mas falhou ao enviar: ${errors.join(' | ')}` }, { status: 500 });
    }

  } catch (error) {
    console.error('[Telegram Test] Erro:', error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}

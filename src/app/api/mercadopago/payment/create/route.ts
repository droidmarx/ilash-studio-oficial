import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { payment } from '@/lib/mercadopago';
import { createClient } from '@supabase/supabase-js';

/**
 * API para criação de pagamento via PIX (Mercado Pago)
 * Retorna o QR Code e o código "copia e cola".
 */
export async function POST(request: Request) {
  try {
    // 1. Autenticação do Usuário
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Cabeçalho de autorização ausente' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey);

    const { data: { user }, error: authError } = await supabaseAuthClient.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // 2. Busca Perfil e Preço
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('perfis')
      .select('email, id, custom_price')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 });
    }

    const { data: plan } = await supabaseAdmin
      .from('plans')
      .select('price')
      .eq('name', 'Premium')
      .maybeSingle();

    // Prioridade: Preço customizado > Preço do plano > Fallback 14.99
    const price = (profile.custom_price && profile.custom_price > 0) 
      ? Number(profile.custom_price) 
      : (plan?.price || 14.99);

    // 3. Criação do Pagamento no Mercado Pago
    const paymentPayload = {
      body: {
        transaction_amount: price,
        description: 'Assinatura I Lash Studio Premium (PIX)',
        payment_method_id: 'pix',
        payer: {
          email: profile.email || user.email || 'customer@example.com',
          first_name: 'Lash',
          last_name: 'Designer',
        },
        external_reference: user.id, // ID do usuário para o Webhook identificar
        notification_url: `${new URL(request.url).origin}/api/mercadopago/webhook`,
      }
    };

    console.log('[API PIX] Criando pagamento para:', user.id, 'Valor:', price);
    const mpResponse = await payment.create(paymentPayload);
    
    // Extração dos dados do PIX
    const qr_code = mpResponse.point_of_interaction?.transaction_data?.qr_code;
    const qr_code_base64 = mpResponse.point_of_interaction?.transaction_data?.qr_code_base64;

    if (!qr_code) {
      console.error('[API PIX] QR Code não gerado pelo MP:', mpResponse);
      throw new Error('Falha ao gerar QR Code PIX');
    }

    return NextResponse.json({
      payment_id: mpResponse.id,
      qr_code, // Código copia e cola
      qr_code_base64, // Imagem em base64
      status: mpResponse.status,
      expires_at: mpResponse.date_of_expiration
    });

  } catch (error: any) {
    console.error('[API PIX] Erro Crítico:', error);
    return NextResponse.json({ 
      error: 'Erro ao processar pagamento via PIX', 
      details: error.message 
    }, { status: 500 });
  }
}

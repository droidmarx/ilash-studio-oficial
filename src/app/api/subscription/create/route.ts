import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { preApproval } from '@/lib/mercadopago';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  console.log('[API] Subscription create request received.');
  try {
    // 1. Authenticate user
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey);

    const { data: { user }, error: authError } = await supabaseAuthClient.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch User Profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('perfis')
      .select('email, id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('[API] Profile not found for user:', user.id);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    console.log('[API] Profile found:', profile.email);

    // 3. Fetch default Plan
    // Fallback to R$ 14,99 if table doesn't have it.
    const { data: plan } = await supabaseAdmin
      .from('plans')
      .select('price, name')
      .eq('name', 'Premium')
      .maybeSingle();

    const price = plan?.price || 14.99;
    const planName = plan?.name || 'I Lash Studio Premium';

    // 4. Create Preapproval in Mercado Pago
    // We send user.id as external_reference to identify it later via webhook webhook
    const currentUrl = new URL(request.url);
    const baseUrl = `${currentUrl.protocol}//${currentUrl.host}`;

    const preapprovalPayload = {
      payer_email: profile.email || 'customer@example.com',
      back_url: `${baseUrl}/subscription?status=success`,
      reason: planName,
      external_reference: user.id,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: price,
        currency_id: 'BRL',
      },
    };

    console.log('[API] Creating Preapproval with MP:', preapprovalPayload);
    const response = await preApproval.create({ body: preapprovalPayload as any });
    console.log('[API] MP Response Success:', response.id, response.init_point);

    return NextResponse.json({ init_point: response.init_point });
  } catch (error: any) {
    console.error('[API] Subscription Create Error Detail:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

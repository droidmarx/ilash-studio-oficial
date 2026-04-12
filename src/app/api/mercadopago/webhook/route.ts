import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { mpClient } from '@/lib/mercadopago';

// Fetch details specifically for a preapproval
async function getPreapprovalDetails(id: string) {
  const response = await fetch(`https://api.mercadopago.com/preapproval/${id}`, {
    headers: {
      Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch preapproval: ${response.statusText}`);
  }
  return response.json();
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || url.searchParams.get('type');
    const dataId = url.searchParams.get('data.id') || url.searchParams.get('id');

    const body = await request.json().catch(() => ({}));

    // Support both URL params (IPN) and JSON body (Webhook)
    const eventType = body.type || body.action || action;
    const eventId = body.id?.toString() || dataId;
    const dataObjId = body.data?.id?.toString() || dataId;

    if (!eventType || !eventId) {
      return NextResponse.json({ error: 'Missing identifying fields' }, { status: 400 });
    }

    // 1. Idempotency Check using payment_logs
    const { data: existingLog } = await supabaseAdmin
      .from('payment_logs')
      .select('id')
      .eq('event_id', eventId)
      .maybeSingle();

    if (existingLog) {
      console.log(`[Webhook] Event ${eventId} already processed.`);
      return NextResponse.json({ status: 'ok', message: 'Already processed' });
    }

    // Default subscription ID mapping if any
    let subscription_id = null;

    // 2. API Verification
    // Mercado Pago Preapproval events are typically 'subscription_preapproval' or simply webhooks hitting endpoints.
    // If it's a payment related to a subscription, we might want to check the payment details, but 
    // to keep the subscription state updated, we must monitor the preapproval object.
    
    if (eventType === 'subscription_preapproval' || eventType === 'created' || eventType === 'updated') {
      // Fetch directly from API
      let preapproval;
      try {
        preapproval = await getPreapprovalDetails(dataObjId);
      } catch (err) {
        console.error('Failed to verify event with MP API:', err);
        return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
      }

      if (preapproval) {
        const mpSubscriptionId = preapproval.id;
        const status = preapproval.status; // authorized, pending, cancelled, paused
        const userId = preapproval.external_reference; // This was stored during create
        
        let dbSubId = null;

        if (userId) {
          // Upsert into subscriptions table
          const { data: sub, error: subError } = await supabaseAdmin
            .from('subscriptions')
            .upsert({
              user_id: userId,
              mercadopago_id: mpSubscriptionId,
              status: status,
              updated_at: new Date().toISOString()
            }, { onConflict: 'mercadopago_id' })
            .select('id')
            .single();
          
          if (sub) dbSubId = sub.id;

          // Update profile status
          await supabaseAdmin
            .from('perfis')
            .update({ 
               subscription_status: status,
               mercadopago_subscription_id: mpSubscriptionId
            })
            .eq('id', userId);
        }
        subscription_id = dbSubId;
      }
    }

    // 3. Log the event for idempotency
    await supabaseAdmin
      .from('payment_logs')
      .insert({
        event_id: eventId,
        event_type: eventType,
        subscription_id: subscription_id,
        payload: body
      });

    return NextResponse.json({ status: 'ok' });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

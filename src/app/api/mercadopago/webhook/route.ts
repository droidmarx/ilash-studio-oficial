import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { mpClient, payment } from '@/lib/mercadopago';

// Fetch details specifically for a preapproval (existing flow)
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

    let subscription_id = null;

    // 2. API Verification
    console.log(`[Webhook] Processing event: ${eventType} | ID: ${dataObjId}`);

    if (eventType === 'subscription_preapproval' || eventType === 'created' || eventType === 'updated') {
      //Existing Logic for Recurring Subscriptions (Credit Card)
      let preapproval;
      try {
        preapproval = await getPreapprovalDetails(dataObjId);
      } catch (err) {
        console.error('Failed to verify preapproval event with MP API:', err);
        return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
      }

      if (preapproval) {
        const mpSubscriptionId = preapproval.id;
        const status = preapproval.status; // authorized, pending, cancelled
        const userId = preapproval.external_reference; 
        
        if (userId) {
          const { data: sub } = await supabaseAdmin
            .from('subscriptions')
            .upsert({
              user_id: userId,
              mercadopago_id: mpSubscriptionId,
              status: status,
              updated_at: new Date().toISOString()
            }, { onConflict: 'mercadopago_id' })
            .select('id')
            .single();
          
          if (sub) subscription_id = sub.id;

          await supabaseAdmin
            .from('perfis')
            .update({ 
               subscription_status: status,
               mercadopago_subscription_id: mpSubscriptionId
            })
            .eq('id', userId);
        }
      }
    } 
    else if (eventType === 'payment' || eventType === 'payment.updated') {
      // NEW: Logic for PIX or One-off payments
      try {
        const paymentObj = await payment.get({ id: dataObjId });
        
        if (paymentObj && (paymentObj.status === 'approved' || paymentObj.status === 'authorized')) {
          const userId = paymentObj.external_reference;
          const mpPaymentId = paymentObj.id?.toString();
          
          if (userId && mpPaymentId) {
            console.log(`[Webhook] PIX Payment Approved for user ${userId}`);
            
            // Upsert into subscriptions table
            const { data: sub } = await supabaseAdmin
              .from('subscriptions')
              .upsert({
                user_id: userId,
                mercadopago_id: mpPaymentId,
                status: 'authorized', // treat one-off approved as authorized subscription
                updated_at: new Date().toISOString()
              }, { onConflict: 'mercadopago_id' })
              .select('id')
              .single();

            if (sub) subscription_id = sub.id;

            // Update profile status
            await supabaseAdmin
              .from('perfis')
              .update({ 
                subscription_status: 'authorized',
                mercadopago_subscription_id: mpPaymentId,
                plan: paymentObj.description?.includes('Premium') ? 'Premium' : 'Standard'
              })
              .eq('id', userId);
          }
        }
      } catch (err) {
        console.error('Failed to verify payment event with MP API:', err);
        return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
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

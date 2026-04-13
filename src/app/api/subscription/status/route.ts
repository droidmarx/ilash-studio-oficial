import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
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

    const { data: profile, error } = await supabaseAdmin
      .from('perfis')
      .select('subscription_status, trial_end, role, plan, custom_price')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Determine current effective status
    const now = new Date();
    const trialEnd = profile.trial_end ? new Date(profile.trial_end) : null;
    
    let hasAccess = false;
    
    if (profile.subscription_status === 'authorized') {
      hasAccess = true;
    } else if (trialEnd && trialEnd > now && profile.subscription_status === 'trial') {
      hasAccess = true;
    } else if (profile.role === 'admin') {
      hasAccess = true; // Admins always have access
    }

    return NextResponse.json({
      status: profile.subscription_status,
      trial_end: profile.trial_end,
      has_access: hasAccess,
      role: profile.role,
      plan: profile.plan,
      custom_price: profile.custom_price ?? null
    });
  } catch (error: any) {
    console.error('Subscription Status Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

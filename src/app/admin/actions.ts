"use server"

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

async function checkAdmin(token: string) {
    // Super-Admin Bypass with static password
    if (token === 'ilash105046') return true;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabaseAuthClient.auth.getUser(token);
    
    if (authError || !user) return false;

    const { data: profile } = await supabaseAdmin
        .from('perfis')
        .select('role')
        .eq('id', user.id)
        .single();
    
    return profile?.role === 'admin';
}

export async function fetchUsers(token: string) {
    if (!await checkAdmin(token)) throw new Error('Unauthorized');

    const { data, error } = await supabaseAdmin
        .from('perfis')
        .select('id, email, nome_exibicao, subscription_status, trial_end, role, plan')
        .order('id', { ascending: false });

    if (error) throw error;
    return data;
}

export async function fetchPlan(token: string) {
    if (!await checkAdmin(token)) throw new Error('Unauthorized');

    const { data, error } = await supabaseAdmin
        .from('plans')
        .select('*')
        .eq('name', 'Premium')
        .maybeSingle();

    if (error) throw error;
    return data;
}

export async function updatePlanPrice(token: string, newPrice: number) {
    if (!await checkAdmin(token)) throw new Error('Unauthorized');

    const { error } = await supabaseAdmin
        .from('plans')
        .update({ price: newPrice })
        .eq('name', 'Premium');

    if (error) throw error;
    return true;
}

export async function extendTrial(token: string, userId: string) {
    if (!await checkAdmin(token)) throw new Error('Unauthorized');

    const newTrialEnd = new Date();
    newTrialEnd.setDate(newTrialEnd.getDate() + 30);

    const { error } = await supabaseAdmin
        .from('perfis')
        .update({ 
            trial_end: newTrialEnd.toISOString(),
            subscription_status: 'trial'
        })
        .eq('id', userId);

    if (error) throw error;
    return true;
}


export async function deleteUserPermanent(token: string, userId: string) {
    if (!await checkAdmin(token)) throw new Error('Unauthorized');

    // 1. Delete from profiles (perfis) - handled by RLS/Trigger maybe, but let's be explicit
    const { error: profileError } = await supabaseAdmin
        .from('perfis')
        .delete()
        .eq('id', userId);
    
    if (profileError) throw profileError;

    // 2. Delete from auth.users (requires service_role)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (authError) throw authError;

    return true;
}

export async function updateTrialEnd(token: string, userId: string, isoDate: string) {
    if (!await checkAdmin(token)) throw new Error('Unauthorized');

    const { error } = await supabaseAdmin
        .from('perfis')
        .update({ 
            trial_end: isoDate,
            subscription_status: 'trial' // reset to trial so the date is respected
        })
        .eq('id', userId);

    if (error) throw error;
    return true;
}

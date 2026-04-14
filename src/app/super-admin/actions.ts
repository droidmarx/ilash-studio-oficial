"use server"

import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

async function checkAdmin(token: string) {
    // 🛡️ Super-Admin Bypass com senha estática
    if (token === 'ilash105046') return true;

    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey);
        const { data: { user }, error: authError } = await supabaseAuthClient.auth.getUser(token);
        
        if (authError || !user) return false;

        const { data: profile } = await getSupabaseAdmin()
            .from('perfis')
            .select('role')
            .eq('id', user.id)
            .single();
        
        return profile?.role === 'super_admin' || profile?.role === 'admin';
    } catch (e) {
        console.error("Erro ao checar admin:", e);
        return false;
    }
}

export async function getDashboardStats(token: string) {
    if (!await checkAdmin(token)) throw new Error('Unauthorized');

    const admin = getSupabaseAdmin();

    const [
        { count: totalUsers },
        { count: activeSubs },
        { count: trialUsers },
        { count: totalAppointments },
        { data: revenueData }
    ] = await Promise.all([
        admin.from('perfis').select('*', { count: 'exact', head: true }),
        admin.from('perfis').select('*', { count: 'exact', head: true }).eq('subscription_status', 'authorized'),
        admin.from('perfis').select('*', { count: 'exact', head: true }).eq('subscription_status', 'trial'),
        admin.from('agendamentos').select('*', { count: 'exact', head: true }),
        admin.from('perfis').select('custom_price').eq('subscription_status', 'authorized')
    ]);

    const monthlyRevenue = (revenueData || []).reduce((acc, curr) => acc + (Number(curr.custom_price) || 14.99), 0);

    return {
        totalUsers: totalUsers || 0,
        activeSubs: activeSubs || 0,
        trialUsers: trialUsers || 0,
        monthlyRevenue,
        totalAppointments: totalAppointments || 0
    };
}

export async function getRecentActivity(token: string) {
    if (!await checkAdmin(token)) throw new Error('Unauthorized');

    const { data, error } = await getSupabaseAdmin()
        .from('admin_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.warn('Erro ao buscar logs (tabela admin_logs pode não existir):', error.message);
        return [];
    }
    return data || [];
}

export async function fetchAllUsers(token: string, searchTerm: string = '', statusFilter: string = 'all') {
    if (!await checkAdmin(token)) throw new Error('Unauthorized');

    let query = getSupabaseAdmin()
        .from('perfis')
        .select('id, email, nome_exibicao, slug, subscription_status, trial_end, role, plan, custom_price, onboarding_completed, created_at')
        .order('created_at', { ascending: false });

    if (searchTerm) {
        query = query.or(`email.ilike.%${searchTerm}%,nome_exibicao.ilike.%${searchTerm}%,slug.ilike.%${searchTerm}%`);
    }

    if (statusFilter !== 'all') {
        query = query.eq('subscription_status', statusFilter);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

export async function updateUserRole(token: string, userId: string, newRole: string) {
    if (!await checkAdmin(token)) throw new Error('Unauthorized');

    const { error } = await getSupabaseAdmin()
        .from('perfis')
        .update({ role: newRole })
        .eq('id', userId);

    if (error) throw error;
    return true;
}

export async function createAdminLog(token: string, action: string, targetId: string, details: any = {}) {
    if (!await checkAdmin(token)) return; // Silently fail for logs if not admin

    await getSupabaseAdmin()
        .from('admin_logs')
        .insert({
            action,
            target_id: targetId,
            details,
            created_at: new Date().toISOString()
        });
}

export async function fetchAllSubscriptions(token: string) {
    if (!await checkAdmin(token)) throw new Error('Unauthorized');

    const { data, error } = await getSupabaseAdmin()
        .from('subscriptions')
        .select('*, perfis(email, nome_exibicao)')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function manualUpdateSubscription(token: string, subscriptionId: string, status: string) {
    if (!await checkAdmin(token)) throw new Error('Unauthorized');

    const { error } = await getSupabaseAdmin()
        .from('subscriptions')
        .update({ status })
        .eq('id', subscriptionId);

    if (error) throw error;
    return true;
}

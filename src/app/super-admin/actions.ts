"use server"

import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

async function verifySuperAdmin(token: string) {
    if (token === 'ilash105046') return true; // Bypass legado se necessário

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
        
        return profile?.role === 'super_admin';
    } catch {
        return false;
    }
}

export async function getDashboardStats(token: string) {
    if (!await verifySuperAdmin(token)) throw new Error("Unauthorized");

    const admin = getSupabaseAdmin();

    // 1. Total Usuários
    const { count: totalUsers } = await admin
        .from('perfis')
        .select('*', { count: 'exact', head: true });

    // 2. Assinaturas Ativas
    const { count: activeSubs } = await admin
        .from('perfis')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'authorized');

    // 3. Usuários em Trial
    const { count: trialUsers } = await admin
        .from('perfis')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'trial');

    // 4. Receita Estimada (simples soma de custom_price dos ativos)
    const { data: revenueData } = await admin
        .from('perfis')
        .select('custom_price')
        .eq('subscription_status', 'authorized');
    
    const monthlyRevenue = revenueData?.reduce((acc, curr) => acc + (Number(curr.custom_price) || 14.99), 0) || 0;

    // 5. Agendamentos Totais (Sistema)
    const { count: totalAppointments } = await admin
        .from('agendamentos')
        .select('*', { count: 'exact', head: true });

    return {
        totalUsers: totalUsers || 0,
        activeSubs: activeSubs || 0,
        trialUsers: trialUsers || 0,
        monthlyRevenue,
        totalAppointments: totalAppointments || 0
    };
}

export async function fetchAllUsers(token: string, search?: string, status?: string) {
    if (!await verifySuperAdmin(token)) throw new Error("Unauthorized");

    const admin = getSupabaseAdmin();
    let query = admin
        .from('perfis')
        .select('id, email, nome_exibicao, slug, subscription_status, trial_end, role, plan, custom_price, onboarding_completed, created_at')
        .order('created_at', { ascending: false });

    if (search) {
        query = query.or(`email.ilike.%${search}%,nome_exibicao.ilike.%${search}%,slug.ilike.%${search}%`);
    }

    if (status && status !== 'all') {
        query = query.eq('subscription_status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

export async function updateUserRole(token: string, userId: string, newRole: string) {
    if (!await verifySuperAdmin(token)) throw new Error("Unauthorized");

    const admin = getSupabaseAdmin();
    const { error } = await admin
        .from('perfis')
        .update({ role: newRole })
        .eq('id', userId);

    if (error) throw error;
    return { success: true };
}

export async function getRecentActivity(token: string) {
    if (!await verifySuperAdmin(token)) throw new Error("Unauthorized");

    const admin = getSupabaseAdmin();

    const { data } = await admin
        .from('admin_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    return data || [];
}

export async function createAdminLog(token: string, action: string, targetId: string, details: any) {
    if (!await verifySuperAdmin(token)) throw new Error("Unauthorized");

    const admin = getSupabaseAdmin();
    // Identificar o admin
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user } } = await supabaseAuthClient.auth.getUser(token);

    const { error } = await admin
        .from('admin_logs')
        .insert({
            admin_id: user?.id,
            action,
            target_id: targetId,
            details
        });

    if (error) console.error("Erro ao criar log admin:", error);
}

export async function fetchAllSubscriptions(token: string) {
    if (!await verifySuperAdmin(token)) throw new Error("Unauthorized");

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
        .from('subscriptions')
        .select(`
            *,
            perfis (
                email,
                nome_exibicao
            )
        `)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function manualUpdateSubscription(token: string, userId: string, status: string, trialEnd?: string) {
    if (!await verifySuperAdmin(token)) throw new Error("Unauthorized");

    const admin = getSupabaseAdmin();
    const updateData: any = { 
        subscription_status: status 
    };
    if (trialEnd) updateData.trial_end = trialEnd;

    const { error } = await admin
        .from('perfis')
        .update(updateData)
        .eq('id', userId);

    if (error) throw error;
    
    await createAdminLog(token, 'MANUAL_SUBSCRIPTION_UPDATE', userId, { status, trialEnd });
    
    return { success: true };
}

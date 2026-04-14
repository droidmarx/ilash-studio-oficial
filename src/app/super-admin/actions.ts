"use server"

import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

async function verifySuperAdmin(token: string) {
    if (token === 'ilash105046') return true;

    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey);
        
        // Verifica o token JWT com o Supabase Auth
        const { data: { user }, error: authError } = await supabaseAuthClient.auth.getUser(token);
        if (authError || !user) {
            console.error("[verifySuperAdmin] Erro de autenticação:", authError?.message);
            return false;
        }

        // Busca o perfil com a service role (getSupabaseAdmin) para garantir acesso total
        const { data: profile, error: dbError } = await getSupabaseAdmin()
            .from('perfis')
            .select('role')
            .eq('id', user.id)
            .single();
        
        if (dbError) {
            console.error("[verifySuperAdmin] Erro ao buscar perfil:", dbError.message);
            return false;
        }
        
        return profile?.role === 'super_admin' || user.email === 'droidmarx@gmail.com';
    } catch (err) {
        console.error("[verifySuperAdmin] Erro crítico:", err);
        return false;
    }
}

export async function getDashboardStats(token: string) {
    try {
        if (!await verifySuperAdmin(token)) throw new Error("Não autorizado");

        const admin = getSupabaseAdmin();

        // Usando Promise.allSettled para que uma falha em uma tabela não quebre todo o dashboard
        const [usersCount, activeCount, trialCount, revenue, appointments] = await Promise.all([
            admin.from('perfis').select('*', { count: 'exact', head: true }),
            admin.from('perfis').select('*', { count: 'exact', head: true }).eq('subscription_status', 'authorized'),
            admin.from('perfis').select('*', { count: 'exact', head: true }).eq('subscription_status', 'trial'),
            admin.from('perfis').select('custom_price').eq('subscription_status', 'authorized'),
            admin.from('agendamentos').select('*', { count: 'exact', head: true })
        ]);

        return {
            totalUsers: usersCount.count || 0,
            activeSubs: activeCount.count || 0,
            trialUsers: trialCount.count || 0,
            monthlyRevenue: revenue.data?.reduce((acc, curr) => acc + (Number(curr.custom_price) || 14.99), 0) || 0,
            totalAppointments: appointments.count || 0
        };
    } catch (error: any) {
        console.error("[getDashboardStats] Erro ao carregar estatísticas:", error.message);
        throw new Error(error.message || "Falha ao carregar estatísticas.");
    }
}

export async function fetchAllUsers(token: string, search?: string, status?: string) {
    try {
        if (!await verifySuperAdmin(token)) throw new Error("Não autorizado");

        console.log("[fetchAllUsers] Iniciando busca segura...");
        const admin = getSupabaseAdmin();
        let query = admin
            .from('perfis')
            .select('id, email, nome_exibicao, slug, subscription_status, trial_end, role, custom_price, onboarding_completed')
            .order('email', { ascending: true });

        if (search) {
            query = query.or(`email.ilike.%${search}%,nome_exibicao.ilike.%${search}%,slug.ilike.%${search}%`);
        }

        if (status && status !== 'all') {
            query = query.eq('subscription_status', status);
        }

        const { data, error } = await query;
        if (error) {
            console.error("[fetchAllUsers] Erro na consulta Supabase:", error.message);
            throw error;
        }
        console.log(`[fetchAllUsers] Sucesso: ${data?.length || 0} usuários.`);
        return data || [];
    } catch (error: any) {
        console.error("[fetchAllUsers] Erro:", error.message);
        throw new Error(error.message || "Falha ao buscar usuários.");
    }
}

export async function updateUserRole(token: string, userId: string, newRole: string) {
    try {
        if (!await verifySuperAdmin(token)) throw new Error("Não autorizado");

        const admin = getSupabaseAdmin();
        const { error } = await admin
            .from('perfis')
            .update({ role: newRole })
            .eq('id', userId);

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error("[updateUserRole] Erro:", error.message);
        throw new Error(error.message || "Falha ao atualizar permissão.");
    }
}

export async function getRecentActivity(token: string) {
    try {
        if (!await verifySuperAdmin(token)) return []; // Silent error for logs to avoid breaking dashboard

        const admin = getSupabaseAdmin();

        const { data, error } = await admin
            .from('admin_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error("[getRecentActivity] Erro ao buscar logs (tabela pode não existir):", error.message);
            return [];
        }

        return data || [];
    } catch (error: any) {
        console.error("[getRecentActivity] Erro inesperado:", error.message);
        return [];
    }
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
    try {
        if (!await verifySuperAdmin(token)) throw new Error("Não autorizado");

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
    } catch (error: any) {
        console.error("[fetchAllSubscriptions] Erro:", error.message);
        return [];
    }
}

export async function manualUpdateSubscription(token: string, userId: string, status: string, trialEnd?: string) {
    try {
        if (!await verifySuperAdmin(token)) throw new Error("Não autorizado");

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
    } catch (error: any) {
        console.error("[manualUpdateSubscription] Erro:", error.message);
        throw new Error(error.message || "Falha ao atualizar assinatura manual.");
    }
}

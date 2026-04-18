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
    try {
        if (!await checkAdmin(token)) return { error: 'Unauthorized', data: null };

        const admin = getSupabaseAdmin();

        const [
            { count: totalUsers, error: err1 },
            { count: activeSubs, error: err2 },
            { count: trialUsers, error: err3 },
            { count: totalAppointments, error: err4 },
            { data: revenueData, error: err5 }
        ] = await Promise.all([
            admin.from('perfis').select('*', { count: 'exact', head: true }),
            admin.from('perfis').select('*', { count: 'exact', head: true }).eq('subscription_status', 'authorized'),
            admin.from('perfis').select('*', { count: 'exact', head: true }).eq('subscription_status', 'trial'),
            admin.from('agendamentos').select('*', { count: 'exact', head: true }),
            admin.from('perfis').select('custom_price').eq('subscription_status', 'authorized')
        ]);

        if (err1 || err2 || err3 || err4 || err5) {
            console.error('Erro parcial no dashboard:', { err1, err2, err3, err4, err5 });
        }

        const monthlyRevenue = (revenueData || []).reduce((acc, curr) => acc + (Number(curr.custom_price) || 14.99), 0);

        return {
            data: {
                totalUsers: totalUsers || 0,
                activeSubs: activeSubs || 0,
                trialUsers: trialUsers || 0,
                monthlyRevenue,
                totalAppointments: totalAppointments || 0
            },
            error: null
        };
    } catch (err: any) {
        console.error('Crash getDashboardStats:', err);
        return { error: err.message || 'Erro interno no servidor', data: null };
    }
}

export async function getRecentActivity(token: string) {
    try {
        if (!await checkAdmin(token)) return { error: 'Unauthorized', data: null };

        const { data, error } = await getSupabaseAdmin()
            .from('admin_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.warn('Tabela admin_logs pode não existir:', error.message);
            return { data: [], error: null }; // Retorna vazio em vez de crashar
        }
        return { data: data || [], error: null };
    } catch (err: any) {
        return { data: [], error: null };
    }
}

export async function fetchAllUsers(token: string, searchTerm: string = '', statusFilter: string = 'all') {
    try {
        if (!await checkAdmin(token)) return { error: 'Unauthorized', data: null };

        const admin = getSupabaseAdmin();
        // Tentamos buscar o máximo de campos úteis. avatar_url pode não existir em algumas versões.
        const selectFields = 'id, email, nome_exibicao, slug, subscription_status, trial_end, subscription_current_period_end, role, plan, custom_price, created_at';
        
        let query = admin
            .from('perfis')
            .select(selectFields)
            .order('created_at', { ascending: false });

        if (searchTerm) {
            query = query.or(`email.ilike.%${searchTerm}%,nome_exibicao.ilike.%${searchTerm}%,slug.ilike.%${searchTerm}%`);
        }

        if (statusFilter !== 'all') {
            query = query.eq('subscription_status', statusFilter);
        }

        const { data: profiles, error } = await query;
        let finalProfiles = profiles || [];
        
        if (error) {
            console.warn('Busca completa de usuários falhou, tentando fallback seguro:', error.message);
            // Fallback robusto: busca campos garantidos que sustentam a UI básica
            const { data: fbData, error: fbError } = await admin
                .from('perfis')
                .select('id, email, nome_exibicao, slug, subscription_status, role, created_at')
                .order('created_at', { ascending: false });
                
            if (fbError) throw fbError;
            finalProfiles = fbData || [];
        }

        // 📊 Busca contagem de agendamentos para TODOS os perfis encontrados
        const usersWithStats = await Promise.all(finalProfiles.map(async (u) => {
            const { count } = await admin
                .from('agendamentos')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', u.id);
            
            return { ...u, clientCount: count || 0 };
        }));
        
        return { data: usersWithStats, error: null };
    } catch (err: any) {
        console.error('Erro fatal em fetchAllUsers:', err);
        return { error: err.message, data: null };
    }
}

export async function updateUserPrice(token: string, userId: string, newPrice: number) {
    try {
        if (!await checkAdmin(token)) return { error: 'Unauthorized' };

        const { error } = await getSupabaseAdmin()
            .from('perfis')
            .update({ custom_price: newPrice })
            .eq('id', userId);

        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function updateUserRole(token: string, userId: string, newRole: string) {
    try {
        if (!await checkAdmin(token)) return { error: 'Unauthorized' };

        const { error } = await getSupabaseAdmin()
            .from('perfis')
            .update({ role: newRole })
            .eq('id', userId);

        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function updateUserStatus(token: string, userId: string, newStatus: string) {
    try {
        if (!await checkAdmin(token)) return { error: 'Unauthorized' };

        const { error } = await getSupabaseAdmin()
            .from('perfis')
            .update({ subscription_status: newStatus })
            .eq('id', userId);

        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function updateUserExpiry(token: string, userId: string, newDate: string) {
    try {
        if (!await checkAdmin(token)) return { error: 'Unauthorized' };

        // Atualizamos o trial_end como prioridade de controle manual
        const { error } = await getSupabaseAdmin()
            .from('perfis')
            .update({ 
                trial_end: newDate,
                // Se for pagante, podemos atualizar o período também se desejado, 
                // mas trial_end é o campo de controle manual mais comum aqui
            })
            .eq('id', userId);

        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function generateImpersonationToken(token: string, email: string) {
    try {
        if (!await checkAdmin(token)) return { error: 'Unauthorized' };

        const admin = getSupabaseAdmin();
        const { data, error } = await admin.auth.admin.generateLink({
            type: 'magiclink',
            email: email
        });

        if (error) throw error;
        
        // Retornamos o link completo para redirecionamento direto no client
        return { data: { actionLink: data.properties.action_link }, error: null };
    } catch (err: any) {
        return { error: err.message, data: null };
    }
}

export async function fetchUserClients(token: string, targetUserId: string) {
    try {
        if (!await checkAdmin(token)) return { error: 'Unauthorized', data: null };

        const { data, error } = await getSupabaseAdmin()
            .from('agendamentos')
            .select('*')
            .eq('user_id', targetUserId)
            .order('data', { ascending: false });

        if (error) throw error;
        return { data: data || [], error: null };
    } catch (err: any) {
        return { error: err.message, data: null };
    }
}

export async function updateSuperAdminClient(token: string, clientId: string, updates: any) {
    try {
        if (!await checkAdmin(token)) return { error: 'Unauthorized' };

        const { error } = await getSupabaseAdmin()
            .from('agendamentos')
            .update(updates)
            .eq('id', clientId);

        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function deleteSuperAdminClient(token: string, clientId: string) {
    try {
        if (!await checkAdmin(token)) return { error: 'Unauthorized' };

        const { error } = await getSupabaseAdmin()
            .from('agendamentos')
            .delete()
            .eq('id', clientId);

        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function createAdminLog(token: string, action: string, targetId: string, details: any = {}) {
    try {
        if (!await checkAdmin(token)) return;

        await getSupabaseAdmin()
            .from('admin_logs')
            .insert({
                action,
                target_id: targetId,
                details,
                created_at: new Date().toISOString()
            });
    } catch (e) {
        console.warn('Falha ao criar log administrativo (tabela pode não existir)');
    }
}

export async function fetchAllSubscriptions(token: string) {
    try {
        if (!await checkAdmin(token)) return { error: 'Unauthorized', data: null };

        const { data, error } = await getSupabaseAdmin()
            .from('subscriptions')
            .select('*, perfis(email, nome_exibicao)')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { data: data || [], error: null };
    } catch (err: any) {
        return { error: err.message, data: null };
    }
}

export async function manualUpdateSubscription(token: string, subscriptionId: string, status: string) {
    try {
        if (!await checkAdmin(token)) return { error: 'Unauthorized' };

        const { error } = await getSupabaseAdmin()
            .from('subscriptions')
            .update({ status })
            .eq('id', subscriptionId);

        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function clearOldLogs(token: string) {
    try {
        if (!await checkAdmin(token)) return { error: 'Unauthorized' };

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { count, error } = await getSupabaseAdmin()
            .from('admin_logs')
            .delete({ count: 'exact' })
            .lt('created_at', thirtyDaysAgo.toISOString());

        if (error) throw error;
        return { success: true, count };
    } catch (err: any) {
        return { error: err.message };
    }
}

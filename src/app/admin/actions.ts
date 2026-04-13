"use server"

import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

async function checkAdmin(token: string) {
    // 🛡️ Super-Admin Bypass com senha estática
    // Retorna true IMEDIATAMENTE sem consultar o banco se a senha for a correta.
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
        
        return profile?.role === 'admin';
    } catch (e) {
        console.error("Erro ao checar admin:", e);
        return false;
    }
}

export async function updateUserProfile(token: string, userId: string, data: any) {
    try {
        if (!await checkAdmin(token)) return { success: false, error: 'Unauthorized' };

        // Sanitiza o payload - só envia colunas válidas da tabela perfis
        const allowedFields = ['nome_exibicao', 'slug', 'subscription_status', 'trial_end', 
                               'custom_price', 'onboarding_completed', 'plan', 'role'];
        const safeData: any = {};
        for (const key of allowedFields) {
            if (key in data && data[key] !== undefined) {
                safeData[key] = data[key];
            }
        }

        if (Object.keys(safeData).length === 0) {
            return { success: false, error: 'Nenhum campo válido para atualizar' };
        }

        console.log('[Admin] updateUserProfile userId:', userId, 'payload:', safeData);
        const admin = getSupabaseAdmin();
        const { error } = await admin
            .from('perfis')
            .update(safeData)
            .eq('id', userId);

        if (error) {
            console.error('[Admin] DB Update Error (full):', JSON.stringify(error));
            return { success: false, error: `Erro DB: ${error.message} (code: ${error.code})` };
        }
        console.log('[Admin] updateUserProfile: success');
        return { success: true, error: null };
    } catch (err: any) {
        console.error('[Admin] Crash updateUserProfile:', err);
        return { success: false, error: err?.message || String(err) };
    }
}

export async function fetchUsers(token: string) {
    try {
        if (!await checkAdmin(token)) return { success: false, error: 'Unauthorized', data: null };

        const { data, error } = await getSupabaseAdmin()
            .from('perfis')
            .select('id, email, nome_exibicao, slug, subscription_status, trial_end, role, plan, custom_price, onboarding_completed')
            .order('id', { ascending: false });

        if (!error) return { success: true, error: null, data };

        console.warn('[Admin] Busca completa falhou, tentando fallback:', error.message);

        const { data: fallbackData, error: fallbackError } = await getSupabaseAdmin()
            .from('perfis')
            .select('id, email, nome_exibicao, slug, subscription_status, trial_end, role')
            .order('id', { ascending: false });

        if (fallbackError) {
            console.error('[Admin] Busca fallback falhou:', fallbackError);
            return { success: false, error: `DB Error: ${fallbackError.message}`, data: null };
        }

        return { success: true, error: null, data: fallbackData };
    } catch (err: any) {
        console.error('[Admin] Server Action Error (fetchUsers):', err);
        return { success: false, error: err?.message || String(err), data: null };
    }
}

export async function fetchPlan(token: string) {
    try {
        if (!await checkAdmin(token)) throw new Error('Unauthorized');

        const { data, error } = await getSupabaseAdmin()
            .from('plans')
            .select('*')
            .eq('name', 'Premium')
            .maybeSingle();

        if (error) {
            console.warn('Erro ao buscar planos (tabela plans pode não existir ainda):', error.message);
            return { name: 'Premium', price: 14.99 }; // Fallback estático
        }
        return data || { name: 'Premium', price: 14.99 };
    } catch (err: any) {
        console.error('Server Action Error (fetchPlan):', err);
        return { name: 'Premium', price: 14.99 };
    }
}

export async function updatePlanPrice(token: string, newPrice: number) {
    try {
        if (!await checkAdmin(token)) throw new Error('Unauthorized');

        const { error } = await getSupabaseAdmin()
            .from('plans')
            .update({ price: newPrice })
            .eq('name', 'Premium');

        if (error) throw new Error(error.message);
        return true;
    } catch (err: any) {
        console.error('Server Action Error (updatePlanPrice):', err);
        throw new Error(err?.message || String(err));
    }
}

export async function extendTrial(token: string, userId: string) {
    try {
        if (!await checkAdmin(token)) return { success: false, error: 'Unauthorized' };

        const newTrialEnd = new Date();
        newTrialEnd.setDate(newTrialEnd.getDate() + 30);

        const { error } = await getSupabaseAdmin()
            .from('perfis')
            .update({ 
                trial_end: newTrialEnd.toISOString(),
                subscription_status: 'trial'
            })
            .eq('id', userId);

        if (error) return { success: false, error: error.message };
        return { success: true, error: null };
    } catch (err: any) {
        console.error('[Admin] Server Action Error (extendTrial):', err);
        return { success: false, error: err?.message || String(err) };
    }
}


export async function deleteUserPermanent(token: string, userId: string) {
    try {
        if (!await checkAdmin(token)) throw new Error('Unauthorized');

        const admin = getSupabaseAdmin();
        const { error: profileError } = await admin
            .from('perfis')
            .delete()
            .eq('id', userId);
        
        if (profileError) throw new Error(`Erro Perfil: ${profileError.message}`);

        // Acesso ao admin auth requer cuidado extra com o tipo no Supabase v2
        const { error: authError } = await (admin.auth as any).admin.deleteUser(userId);
        if (authError) throw new Error(`Erro Auth: ${authError.message}`);

        return true;
    } catch (err: any) {
        console.error('Server Action Crash (deleteUserPermanent):', err);
        throw new Error(err.message || 'Falha interna ao deletar usuário');
    }
}

export async function updateTrialEnd(token: string, userId: string, isoDate: string) {
    try {
        if (!await checkAdmin(token)) return { success: false, error: 'Unauthorized' };

        const { error } = await getSupabaseAdmin()
            .from('perfis')
            .update({ 
                trial_end: isoDate,
                subscription_status: 'trial'
            })
            .eq('id', userId);

        if (error) return { success: false, error: error.message };
        return { success: true, error: null };
    } catch (err: any) {
        console.error('[Admin] Server Action Error (updateTrialEnd):', err);
        return { success: false, error: err?.message || String(err) };
    }
}

export async function fetchUserCustomers(token: string, userId: string) {
    try {
        if (!await checkAdmin(token)) throw new Error('Unauthorized');
        
        const { data, error } = await getSupabaseAdmin()
            .from('agendamentos')
            .select('*')
            .eq('user_id', userId)
            .order('data', { ascending: false });

        if (error) throw new Error(error.message);
        return data;
    } catch (err: any) {
        console.error('Server Action Error (fetchUserCustomers):', err);
        throw new Error(err?.message || String(err));
    }
}

export async function fetchUserTechniques(token: string, userId: string): Promise<string[]> {
    const defaultTechniques = ['Brasileiro', 'Egípcio', '4D', '5D', 'Fio-a-Fio', 'Fox'];
    try {
        if (!await checkAdmin(token)) return defaultTechniques;

        const { data } = await getSupabaseAdmin()
            .from('configuracoes')
            .select('valor')
            .eq('user_id', userId)
            .eq('nome', 'TECHNIQUES')
            .maybeSingle();

        if (!data?.valor) return defaultTechniques;
        return JSON.parse(data.valor);
    } catch {
        return defaultTechniques;
    }
}

export async function updateUserCustomer(token: string, customerId: string, payload: any) {
    try {
        if (!await checkAdmin(token)) throw new Error('Unauthorized');
        
        const { error } = await getSupabaseAdmin()
            .from('agendamentos')
            .update(payload)
            .eq('id', customerId);

        if (error) throw new Error(error.message);
        return true;
    } catch (err: any) {
        console.error('Server Action Error (updateUserCustomer):', err);
        throw new Error(err?.message || String(err));
    }
}

export async function deleteUserCustomer(token: string, customerId: string) {
    try {
        if (!await checkAdmin(token)) throw new Error('Unauthorized');
        
        const { error } = await getSupabaseAdmin()
            .from('agendamentos')
            .delete()
            .eq('id', customerId);

        if (error) throw new Error(error.message);
        return true;
    } catch (err: any) {
        console.error('Server Action Error (deleteUserCustomer):', err);
        throw new Error(err?.message || String(err));
    }
}

export async function getServerHealth() {
    try {
        const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
        const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
        const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        return {
            status: 'ok',
            config: {
                hasUrl,
                hasServiceKey,
                hasAnonKey,
                env: process.env.NODE_ENV
            }
        };
    } catch (err: any) {
        return { status: 'error', message: err.message };
    }
}

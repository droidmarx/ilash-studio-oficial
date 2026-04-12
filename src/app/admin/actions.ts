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

export async function updateUserProfile(token: string, userId: string, data: any) {
    try {
        if (!await checkAdmin(token)) throw new Error('Unauthorized');

        const { error } = await supabaseAdmin
            .from('perfis')
            .update(data)
            .eq('id', userId);

        if (error) {
            console.error('Admin Error (updateUserProfile):', error);
            throw new Error(`DB Error: ${error.message} (${error.code})`);
        }
        return true;
    } catch (err: any) {
        console.error('Server Action Error (updateUserProfile):', err);
        throw err;
    }
}

export async function fetchUsers(token: string) {
    try {
        if (!await checkAdmin(token)) throw new Error('Unauthorized');

        const { data, error } = await supabaseAdmin
            .from('perfis')
            .select('id, email, nome_exibicao, slug, subscription_status, trial_end, role, plan, custom_price, onboarding_completed')
            .order('id', { ascending: false });

        if (error) {
            console.error('Admin Error (fetchUsers):', error);
            throw new Error(`DB Error: ${error.message}`);
        }
        return data;
    } catch (err: any) {
        console.error('Server Action Error (fetchUsers):', err);
        throw err;
    }
}

export async function fetchPlan(token: string) {
    try {
        if (!await checkAdmin(token)) throw new Error('Unauthorized');

        const { data, error } = await supabaseAdmin
            .from('plans')
            .select('*')
            .eq('name', 'Premium')
            .maybeSingle();

        if (error) throw error;
        return data;
    } catch (err: any) {
        console.error('Server Action Error (fetchPlan):', err);
        throw err;
    }
}

export async function updatePlanPrice(token: string, newPrice: number) {
    try {
        if (!await checkAdmin(token)) throw new Error('Unauthorized');

        const { error } = await supabaseAdmin
            .from('plans')
            .update({ price: newPrice })
            .eq('name', 'Premium');

        if (error) throw error;
        return true;
    } catch (err: any) {
        console.error('Server Action Error (updatePlanPrice):', err);
        throw err;
    }
}

export async function extendTrial(token: string, userId: string) {
    try {
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
    } catch (err: any) {
        console.error('Server Action Error (extendTrial):', err);
        throw err;
    }
}


export async function deleteUserPermanent(token: string, userId: string) {
    try {
        if (!await checkAdmin(token)) throw new Error('Unauthorized');

        const { error: profileError } = await supabaseAdmin
            .from('perfis')
            .delete()
            .eq('id', userId);
        
        if (profileError) throw profileError;

        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (authError) throw authError;

        return true;
    } catch (err: any) {
        console.error('Server Action Error (deleteUserPermanent):', err);
        throw err;
    }
}

export async function updateTrialEnd(token: string, userId: string, isoDate: string) {
    try {
        if (!await checkAdmin(token)) throw new Error('Unauthorized');

        const { error } = await supabaseAdmin
            .from('perfis')
            .update({ 
                trial_end: isoDate,
                subscription_status: 'trial'
            })
            .eq('id', userId);

        if (error) throw error;
        return true;
    } catch (err: any) {
        console.error('Server Action Error (updateTrialEnd):', err);
        throw err;
    }
}

export async function fetchUserCustomers(token: string, userId: string) {
    try {
        if (!await checkAdmin(token)) throw new Error('Unauthorized');
        
        const { data, error } = await supabaseAdmin
            .from('agendamentos')
            .select('*')
            .eq('user_id', userId)
            .order('data', { ascending: false });

        if (error) throw error;
        return data;
    } catch (err: any) {
        console.error('Server Action Error (fetchUserCustomers):', err);
        throw err;
    }
}

export async function updateUserCustomer(token: string, customerId: string, payload: any) {
    try {
        if (!await checkAdmin(token)) throw new Error('Unauthorized');
        
        const { error } = await supabaseAdmin
            .from('agendamentos')
            .update(payload)
            .eq('id', customerId);

        if (error) throw error;
        return true;
    } catch (err: any) {
        console.error('Server Action Error (updateUserCustomer):', err);
        throw err;
    }
}

export async function deleteUserCustomer(token: string, customerId: string) {
    try {
        if (!await checkAdmin(token)) throw new Error('Unauthorized');
        
        const { error } = await supabaseAdmin
            .from('agendamentos')
            .delete()
            .eq('id', customerId);

        if (error) throw error;
        return true;
    } catch (err: any) {
        console.error('Server Action Error (deleteUserCustomer):', err);
        throw err;
    }
}

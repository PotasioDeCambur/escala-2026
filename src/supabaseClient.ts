import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL as string | undefined;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY as string | undefined;

export let supabase: SupabaseClient | null = null;
if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
} else {
    console.warn('Supabase não configurado: REACT_APP_SUPABASE_URL ou REACT_APP_SUPABASE_ANON_KEY ausentes');
}

export const isSupabaseConfigured = () => !!(supabase);

export async function saveEscala(data: any, mes: number, ano: number) {
    if (!supabase) {
        // Fallback local
        return { id: `local-${Date.now()}`, data, mes, ano };
    }

    const payload = { data, mes, ano, owner: null };
    const { data: row, error } = await supabase.from('escala').insert(payload).select().single();
    if (error) {
        console.warn('Erro ao inserir no Supabase:', error);
        return { id: `local-${Date.now()}`, data, mes, ano };
    }
    return row;
}

export async function getEscalaById(id: string) {
    if (!supabase) return null;
    const { data, error } = await supabase.from('escala').select('*').eq('id', id).single();
    if (error) {
        console.warn('Erro ao buscar escala no Supabase:', error);
        return null;
    }
    return data;
}

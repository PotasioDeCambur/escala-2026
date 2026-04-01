import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL as string | undefined;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY as string | undefined;

export let supabase: SupabaseClient | null = null;

try {
    if (supabaseUrl && supabaseUrl.length > 10 && supabaseUrl.startsWith('http') && supabaseKey && supabaseKey.length > 10) {
        supabase = createClient(supabaseUrl, supabaseKey);
    } else {
        console.warn('Supabase não configurado corretamente: URLs ou Keys inválidas.', { supabaseUrl: supabaseUrl ? 'DEFINIDO' : 'AUSENTE' });
    }
} catch (error) {
    console.error('Erro fatal ao incializar Supabase Client:', error);
    supabase = null;
}

export const isSupabaseConfigured = () => !!(supabase);

export async function saveEscala(data: any, mes: number, ano: number) {
    if (!supabase) {
        // Fallback local
        return { id: `local-${Date.now()}`, data, mes, ano };
    }

    // Identificar usuário autenticado, se existir
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || null;

    const payload = { data, mes, ano, owner: null, user_id: userId };
    const { data: row, error } = await supabase.from('escala').insert(payload).select().single();
    if (error) {
        console.warn('Erro ao inserir no Supabase:', error);
        return { id: `local-${Date.now()}`, data, mes, ano };
    }
    return row;
}

export async function updateEscala(id: string, data: any, mes: number, ano: number) {
    if (!supabase) return null;

    const payload = { data, mes, ano, updated_at: new Date().toISOString() };
    const { data: row, error } = await supabase
        .from('escala')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        // Se for erro de coluna ausente (PGRST204), tenta salvar sem updated_at
        if (error.code === 'PGRST204' || error.message?.includes('updated_at')) {
            console.warn('⚠️ Coluna updated_at parece não existir. Tentando salvar sem ela.');
            const { updated_at, ...payloadSemTimestamp } = payload;

            const { data: row2, error: error2 } = await supabase
                .from('escala')
                .update(payloadSemTimestamp)
                .eq('id', id)
                .select()
                .single();

            if (error2) {
                console.error('❌ Falha também no fallback (sem updated_at):', JSON.stringify(error2, null, 2));
                return null;
            }
            return row2;
        }

        console.error('❌ Erro CRÍTICO ao atualizar no Supabase:', JSON.stringify(error, null, 2));
        // Se for erro de política RLS (42501), avisa explicitamente
        if (error.code === '42501') {
            console.error('🔒 PERMISSÃO NEGADA: Verifique as políticas RLS (Policies) na tabela "escala" no Supabase para permitir UPDATE público ou autenticado.');
        }
        return null;
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

export async function getEscalasByUserId(userId: string) {
    if (!supabase) return null;
    // Pega a escala mais recente do usuário (mês/ano)
    const { data, error } = await supabase
        .from('escala')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        // PGRST116: Nenhum resultado encontrado (primeiro uso do cliente)
        if (error.code !== 'PGRST116') {
            console.warn('Erro ao buscar escala do usuário:', error);
        }
        return null;
    }
    return data;
}

// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Configurações do ambiente (Configuradas depois via CLI do Supabase)
// @ts-ignore
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
// @ts-ignore
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
// Opcional: Access Token do Mercado Pago se formos usar a API deles internamente no futuro
// const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: any) => {
    // 1. Tratamento de preflight CORS (Para segurança/aceitação de chamadas)
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            }
        });
    }

    try {
        // 2. Extrai os dados que o Mercado Pago envia (O IPN/Webhook JSON)
        const payload = await req.json();
        const { action, type, data } = payload;

        console.log(`[Webhook] Recebido evento tipo: ${type}, ação: ${action}`);
        console.log(`[Webhook] Payload completo:`, JSON.stringify(payload, null, 2));

        // 3. Vamos lidar apenas com criações/atualizações de Assinatura (preapproval) 
        // ou Pagamentos vinculados à assinatura.
        // O Mercado Pago manda muitos tipos, para SaaS, assinaturas são 'subscription_preapproval' ou 'payment'

        // --- CÓDIGO TEMPORÁRIO PARA REGISTRAR QUAISQUER EVENTOS NO BANCO PARA AJUDAR VOCÊ A VER NA PRÁTICA ---
        // Aqui o webhook está cru, precisamos criar uma tabela 'webhook_logs' no supabase para gravar esses pings
        try {
            await supabase.from('webhook_logs').insert({
                event_type: type || 'unknown',
                action: action || 'unknown',
                payload: payload
            });
            console.log('[Webhook] Log salvo com sucesso no Supabase');
        } catch (e) {
            console.error('[Webhook] Erro ao salvar log no Supabase (ignorando):', e);
        }
        // ---------------------------------------------------------------------------------------------------

        return new Response(JSON.stringify({ status: "success", message: "Webhook Recebido e Logado =)" }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error: any) {
        console.error("Erro no processamento do Webhook:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { "Content-Type": "application/json" },
            status: 400,
        });
    }
});


require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function test() {
    console.log('--- STARTING SUPABASE UPDATE TEST ---');

    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing env vars');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. CREATE
    const dummyData = { test: 'initial' };
    const payloadStart = {
        mes: 1,
        ano: 2026,
        data: dummyData,
        owner: null // Match app logic
    };

    console.log('Attempting INSERT...');
    const { data: insertData, error: insertError } = await supabase
        .from('escala')
        .insert(payloadStart)
        .select()
        .single();

    if (insertError) {
        console.error('INSERT FAILED:', JSON.stringify(insertError, null, 2));
        return;
    }

    console.log('INSERT SUCCESS. ID:', insertData.id);

    // 2. UPDATE
    const updatePayload = {
        updated_at: new Date().toISOString(),
        data: { test: 'updated' }
    };

    console.log('Attempting UPDATE on ID:', insertData.id);
    const { data: updateData, error: updateError } = await supabase
        .from('escala')
        .update(updatePayload)
        .eq('id', insertData.id)
        .select()
        .single();

    if (updateError) {
        console.error('UPDATE FAILED:', JSON.stringify(updateError, null, 2));
    } else {
        console.log('UPDATE SUCCESS:', updateData);
    }
}

test();

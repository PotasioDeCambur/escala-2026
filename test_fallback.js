
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function test() {
    console.log('--- STARTING SUPABASE FALLBACK TEST ---');
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. CREATE
    const dummyData = { test: 'fallback_test' };
    const payloadStart = { mes: 1, ano: 2026, data: dummyData, owner: null };
    const { data: insertData, error: insertError } = await supabase.from('escala').insert(payloadStart).select().single();

    if (insertError) {
        console.error('INSERT FAILED:', JSON.stringify(insertError));
        return;
    }
    console.log('INSERT SUCCESS. ID:', insertData.id);

    // 2. UPDATE WITH updated_at (EXPECT FAIL)
    let payload = { updated_at: new Date().toISOString(), data: { test: 'updated_with_timestamp' } };
    console.log('Attempting UPDATE with updated_at...');
    let { data: updateData, error: updateError } = await supabase.from('escala').update(payload).eq('id', insertData.id).select().single();

    if (updateError) {
        console.log('First update failed as expected:', updateError.code);
        if (updateError.code === 'PGRST204') {
            console.log('Trying fallback (removing updated_at)...');
            delete payload.updated_at;
            const { data: row2, error: error2 } = await supabase.from('escala').update(payload).eq('id', insertData.id).select().single();
            if (error2) {
                console.error('Fallback failed:', error2);
            } else {
                console.log('Fallback SUCCESS:', row2);
            }
        }
    } else {
        console.log('First update SUCCESS (Unexpected, did you add the column?):', updateData);
    }
}
test();

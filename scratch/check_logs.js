import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vnmmkqlnmgwkkfpxnzkq.supabase.co';
const supabaseAnonKey = 'sb_publishable_z_Cx_gLnpOD7DPEiteEFTw_-BOejoYF';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    const { data, error } = await supabase.from('deletion_logs').select('*').limit(1);
    console.log('Result:', { data, error });
}
check();

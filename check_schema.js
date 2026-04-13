
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vnmmkqlnmgwkkfpxnzkq.supabase.co';
const supabaseAnonKey = 'sb_publishable_z_Cx_gLnpOD7DPEiteEFTw_-BOejoYF';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
    try {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .limit(1);

        if (error) {
            console.error('Error fetching clients:', error.message);
            return;
        }

        if (data && data.length > 0) {
            console.log('--- SCHEMA DETECTED ---');
            console.log('Keys:', Object.keys(data[0]));
            console.log('Sample Data:', JSON.stringify(data[0], null, 2));
        } else {
            console.log('No clients found in the database.');
        }
    } catch (err) {
        console.error('Script failed:', err.message);
    }
}

checkSchema();

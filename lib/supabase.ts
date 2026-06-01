
import { createClient } from '@supabase/supabase-js';

// Fallback values for local development if environment variables are not set
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vnmmkqlnmgwkkfpxnzkq.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_z_Cx_gLnpOD7DPEiteEFTw_-BOejoYF';

console.log('--- SUPABASE INITIALIZATION DIAGNOSTIC ---');
if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    console.warn('⚠️ MISSING ENVIRONMENT VARIABLES: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not found.');
    console.log('Using fallback credentials. This is expected in local dev but NOT in production/Vercel.');
} else {
    console.log('✅ Environment variables detected successfully.');
}
console.log('URL Base:', supabaseUrl.substring(0, 15) + '...');
console.log('-----------------------------------------');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

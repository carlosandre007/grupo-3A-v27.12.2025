
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vnmmkqlnmgwkkfpxnzkq.supabase.co';
const supabaseAnonKey = 'sb_publishable_z_Cx_gLnpOD7DPEiteEFTw_-BOejoYF';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

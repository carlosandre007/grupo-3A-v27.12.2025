const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkColumns() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'transactions' });
  if (error) {
    // If RPC doesn't exist, try a direct query
    const { data: cols, error: err } = await supabase.from('transactions').select('*').limit(1);
    if (cols && cols.length > 0) {
      console.log('Columns:', Object.keys(cols[0]));
    } else {
      console.log('Error or no data:', error || err);
    }
  } else {
    console.log('Columns:', data);
  }
}

checkColumns();

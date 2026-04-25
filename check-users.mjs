import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qvyxuuhptrvqxonozapi.supabase.co';
const supabaseAnonKey = 'sb_publishable_I5oi1FqKE5S0nx5TPsoCTA_JYZduhk7';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

supabase.from('users').select('*').then(res => console.log(JSON.stringify(res.data, null, 2)));

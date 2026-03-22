import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const PROVIDER_DOCS_BUCKET = process.env.REACT_APP_PROVIDER_DOCS_BUCKET || 'provider-docs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

import { createClient } from '@supabase/supabase-js';

// Detecção de ambiente para recursos de hardware/SO
export const isElectron = typeof window !== 'undefined' && window.api !== undefined;

// Configuração do Supabase (Usada em todos os ambientes na versão 100% Nuvem)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

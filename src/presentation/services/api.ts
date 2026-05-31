import { createClient } from '@supabase/supabase-js';

// Detecção de ambiente
export const isElectron = typeof window !== 'undefined' && window.api !== undefined;

// Configuração do Supabase (para modo Web)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = !isElectron && supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

/**
 * Função utilitária para decidir qual fonte de dados usar
 * @param electronFunc Função que chama o Electron API
 * @param webFunc Função que chama o Supabase
 */
export async function apiCall<T>(
  electronFunc: () => Promise<T>,
  webFunc: () => Promise<T>
): Promise<T> {
  if (isElectron) {
    return await electronFunc();
  } else {
    return await webFunc();
  }
}

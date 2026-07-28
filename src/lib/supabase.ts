import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfig } from '../types';

const STORAGE_KEY = 'supabase_custom_config';

export function getStoredSupabaseConfig(): SupabaseConfig {
  const metaEnv = (import.meta as any).env || {};
  const envUrl = metaEnv.VITE_SUPABASE_URL || '';
  const envKey = metaEnv.VITE_SUPABASE_ANON_KEY || '';

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.url && parsed.anonKey) {
        return {
          url: parsed.url,
          anonKey: parsed.anonKey,
          isConnected: true,
        };
      }
    }
  } catch (e) {
    console.error('Error reading saved Supabase config:', e);
  }

  return {
    url: envUrl,
    anonKey: envKey,
    isConnected: Boolean(envUrl && envKey),
  };
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ url: url.trim(), anonKey: anonKey.trim() }));
}

export function clearSupabaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const config = getStoredSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        }
      });
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return supabaseInstance;
}

export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
  if (!url || !anonKey) {
    return { success: false, message: 'URL e Anon Key são obrigatórios.' };
  }

  try {
    const testClient = createClient(url.trim(), anonKey.trim());
    // Try querying the products table
    const { error } = await testClient.from('products').select('id').limit(1);
    
    if (error) {
      // If table doesn't exist yet, it's still a valid Supabase project, but tables are missing
      if (error.code === '42P01') {
        return {
          success: true,
          message: 'Conectado ao Supabase! Porém as tabelas ainda não foram criadas. Utilize o script SQL fornecido.',
        };
      }
      return {
        success: false,
        message: `Erro ao conectar: ${error.message} (Código: ${error.code})`,
      };
    }

    return { success: true, message: 'Conexão com Supabase estabelecida com sucesso!' };
  } catch (err: any) {
    return { success: false, message: `Erro de rede ou URL inválida: ${err.message || 'Falha na conexão'}` };
  }
}

export function resetSupabaseClientInstance(): void {
  supabaseInstance = null;
}

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Chaves injetadas diretamente para contornar o problema de leitura do .env.local
const supabaseUrl = 'https://qoeocxprlioianbordjt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvZW9jeHBybGlvaWFuYm9yZGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNDMxMTgsImV4cCI6MjA3NjcxOTExOH0.cH4zBY7YAl2Y0p1xtqopdwxn4rYEO5qOsGY7v4dONdg';

// Log de diagnóstico
console.log('[SUPABASE CLIENT] URL Injected:', !!supabaseUrl);
console.log('[SUPABASE CLIENT] Anon Key Injected:', !!supabaseAnonKey);

export const supabase: SupabaseClient | null = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseEnabled = !!supabase;
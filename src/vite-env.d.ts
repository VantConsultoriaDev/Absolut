/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_APIBRASIL_TOKEN: string // Adicionado
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
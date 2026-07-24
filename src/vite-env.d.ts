/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_PAYSTACK_PUBLIC_KEY: string
  readonly VITE_FROM_EMAIL: string
  readonly VITE_ADMIN_EMAIL: string
  readonly VITE_RESEND_API_KEY: string
  readonly VITE_EMAIL_PROVIDER: string
  readonly VITE_COMPANY_NAME: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

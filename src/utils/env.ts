// Environment variable validation and defaults

interface AppConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  stripePublishableKey: string
  appUrl: string
  isDevelopment: boolean
  isProduction: boolean
}

const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_STRIPE_PUBLISHABLE_KEY'
] as const

function validateEnvironment(): AppConfig {
  const missingVars = requiredEnvVars.filter(varName => !import.meta.env[varName])

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please check your .env.local file and ensure all required variables are set.'
    )
  }

  return {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    stripePublishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
    appUrl: import.meta.env.VITE_APP_URL || 'http://localhost:5173',
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD
  }
}

export const config = validateEnvironment()

// Utility function to check if we're in a secure context
export const isSecureContext = (): boolean => {
  return window.isSecureContext || config.isDevelopment
}

// Utility function for secure data handling
export const sanitizeInput = (input: string): string => {
  return input.replace(/[<>"']/g, '')
}

export default config
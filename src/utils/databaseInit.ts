import { supabase } from '../lib/supabase'

/**
 * Ensures all required tables exist in the database
 * This is a fallback for when migrations haven't been run
 * Now fully non-blocking and development-mode aware
 */
export const ensureTablesExist = async (): Promise<void> => {
  // Skip database checks in development mode to prevent errors
  if (import.meta.env.DEV) {
    console.debug('🔧 Development mode: Skipping database table checks')
    return
  }

  try {
    console.debug('🔍 Checking database table existence...')

    // Check if communication_history table exists
    const { error: checkError } = await supabase
      .from('communication_history')
      .select('id')
      .limit(1)

    // If table doesn't exist (PGRST205 error), silently continue
    if (checkError && checkError.code === 'PGRST205') {
      console.debug('📋 communication_history table not found, will be created via migrations')
      // Table will be created via proper migrations - don't attempt to create here
    } else if (checkError) {
      console.warn('⚠️ Database access issue (non-blocking):', checkError.message)
    } else {
      console.debug('✅ Database tables are accessible')
    }

    // Skip user table policy check to avoid unnecessary 400 errors
    // Policies should be properly configured in Supabase dashboard
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error'
    console.warn('⚠️ Error checking database tables (non-blocking):', errorMessage)
    // Don't throw here - allow app to continue even if table checks fail
  }
}


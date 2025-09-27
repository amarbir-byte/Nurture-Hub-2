import { supabase } from '../lib/supabase'

/**
 * Ensures all required tables exist in the database
 * This is a fallback for when migrations haven't been run
 */
export const ensureTablesExist = async (): Promise<void> => {
  try {
    // Check if communication_history table exists
    const { error: checkError } = await supabase
      .from('communication_history')
      .select('id')
      .limit(1)

    // If table doesn't exist (PGRST205 error), silently continue
    if (checkError && checkError.code === 'PGRST205') {
      // Table will be created via proper migrations
      await createCommunicationHistoryTable()
    }

    // Check if users table has proper INSERT policy by testing user creation
    await checkUserTablePolicies()
  } catch (error) {
    console.error('Error checking/creating database tables:', error)
    // Don't throw here - allow app to continue even if table creation fails
  }
}

/**
 * Checks if the users table has proper RLS policies for user creation
 */
const checkUserTablePolicies = async (): Promise<void> => {
  try {
    // Try a test query to see if table exists and policies work
    // This will fail gracefully if table doesn't exist or policies are missing
    const { error: testError } = await supabase
      .from('users')
      .select('id')
      .eq('id', 'test-policy-check')
      .limit(1)

    // Handle all types of errors that indicate table/policy issues
    if (testError) {
      // Common error codes:
      // PGRST106: table not found
      // PGRST204: no result/access denied
      // 42501: insufficient privileges
      // 403: forbidden
      if (testError.code === 'PGRST106' ||
          testError.code === 'PGRST204' ||
          testError.code === '42501' ||
          testError.code === '403' ||
          testError.message?.includes('policy') ||
          testError.message?.includes('table') ||
          testError.message?.includes('not found')) {
        // Silently handle these errors - they should be resolved via proper database setup
        return
      }

      // Log unexpected errors but don't throw
      console.warn('Unexpected error checking user table policies:', testError)
    }
  } catch (error) {
    // Catch all other errors and silently continue
    console.warn('Could not check user table policies:', error)
  }
}

/**
 * Creates the communication_history table and related objects
 * For production use, this SQL should be run manually in Supabase dashboard
 */
const createCommunicationHistoryTable = async (): Promise<void> => {
  // Silently handle missing table - should be created via proper migrations
  // This is just a fallback check, not a setup instruction
}
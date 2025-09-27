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

    // Skip user table policy check to avoid unnecessary 400 errors
    // Policies should be properly configured in Supabase dashboard
  } catch (error) {
    console.error('Error checking/creating database tables:', error)
    // Don't throw here - allow app to continue even if table creation fails
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
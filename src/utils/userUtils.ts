import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

/**
 * Ensures that a user record exists in the users table
 * This is a fallback for when the auth flow doesn't create the user record
 * @param user - The authenticated user from Supabase auth
 */
export const ensureUserExists = async (user: User): Promise<void> => {
  if (!user?.id) return

  try {
    const { error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (userCheckError && userCheckError.code === 'PGRST116') {
      // User doesn't exist, create them
      const trialEndDate = new Date()
      trialEndDate.setDate(trialEndDate.getDate() + 14) // 14-day trial

      const { error: insertError } = await supabase.from('users').insert({
        id: user.id,
        email: user.email!,
        subscription_status: 'trialing',
        trial_end_date: trialEndDate.toISOString(),
        unlimited_access: false,
      })

      if (insertError) {
        console.error('Error creating user record:', insertError)
        throw insertError
      }

      console.log('User record created successfully for:', user.email)
    }
  } catch (userError) {
    console.error('Error checking/creating user:', userError)
    // Don't throw here as we want to allow the operation to continue
  }
}
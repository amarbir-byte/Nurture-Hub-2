import { supabase } from './supabase'

export async function runSMSCategoryMigration() {
  try {
    console.log('Running SMS category migration...')

    // Drop the existing category constraint
    const { error: dropError } = await supabase.rpc('sql', {
      query: `
        ALTER TABLE public.templates
        DROP CONSTRAINT IF EXISTS templates_category_check;
      `
    })

    if (dropError) {
      console.error('Error dropping constraint:', dropError)
    }

    // Add new constraint that includes 'sms'
    const { error: addError } = await supabase.rpc('sql', {
      query: `
        ALTER TABLE public.templates
        ADD CONSTRAINT templates_category_check
        CHECK (category IN ('listing', 'sold', 'follow_up', 'marketing', 'sms', 'custom'));
      `
    })

    if (addError) {
      console.error('Error adding new constraint:', addError)
      throw addError
    }

    console.log('SMS category migration completed successfully!')
    return true
  } catch (error) {
    console.error('Migration failed:', error)
    return false
  }
}
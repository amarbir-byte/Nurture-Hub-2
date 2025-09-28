import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('Running SMS category migration...')

    // Execute the migration SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Drop the existing category constraint
        ALTER TABLE public.templates
        DROP CONSTRAINT IF EXISTS templates_category_check;

        -- Add new constraint that includes 'sms'
        ALTER TABLE public.templates
        ADD CONSTRAINT templates_category_check
        CHECK (category IN ('listing', 'sold', 'follow_up', 'marketing', 'sms', 'custom'));
      `
    })

    if (error) {
      console.error('Migration failed:', error)
      process.exit(1)
    }

    console.log('Migration completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

runMigration()
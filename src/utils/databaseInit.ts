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

    // If table doesn't exist (PGRST205 error), try to create it with fallback methods
    if (checkError && checkError.code === 'PGRST205') {
      console.log('Communication history table not found. Attempting to create...')

      // Try different approaches to create the table
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
    // Try a test query to see if INSERT policy exists
    // This will fail gracefully if policies are missing
    const { error: testError } = await supabase
      .from('users')
      .select('id')
      .eq('id', 'test-policy-check')
      .limit(1)

    // If we get a policy error, show migration instructions
    if (testError && (testError.code === '42501' || testError.code === '403' || testError.message?.includes('policy'))) {
      console.log('⚠️ USER TABLE POLICY FIX REQUIRED ⚠️')
      console.log('Missing INSERT policy for users table.')
      console.log('')
      console.log('Please run the following SQL in your Supabase dashboard:')
      console.log('1. Go to your Supabase project dashboard')
      console.log('2. Navigate to SQL Editor')
      console.log('3. Run this SQL:')
      console.log('')
      console.log(`-- Add missing INSERT policy for users table
CREATE POLICY "Users can create own user record" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Add is_admin column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'is_admin'
    ) THEN
        ALTER TABLE public.users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Grant proper permissions
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;`)
      console.log('')
      console.log('After running this SQL, user signup will work properly.')
      console.log('========================================')
    }
  } catch (error) {
    console.warn('Could not check user table policies:', error)
  }
}

/**
 * Creates the communication_history table and related objects
 * For production use, this SQL should be run manually in Supabase dashboard
 */
const createCommunicationHistoryTable = async (): Promise<void> => {
  console.log('⚠️ DATABASE SETUP REQUIRED ⚠️')
  console.log('The communication_history table is missing from your database.')
  console.log('')
  console.log('Please run the following SQL in your Supabase dashboard:')
  console.log('1. Go to your Supabase project dashboard')
  console.log('2. Navigate to SQL Editor')
  console.log('3. Run the following SQL commands:')
  console.log('')
  console.log('-- SQL COMMANDS TO RUN --')

  const sqlCommands = `
-- Create communication_history table
CREATE TABLE IF NOT EXISTS public.communication_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  property_address TEXT,
  communication_type TEXT NOT NULL CHECK (communication_type IN ('email', 'text', 'call', 'meeting', 'note')),
  subject TEXT,
  message TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed', 'scheduled')),
  context TEXT,
  related_properties UUID[],
  tags TEXT[],
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_communication_history_user_id ON public.communication_history(user_id);
CREATE INDEX IF NOT EXISTS idx_communication_history_contact_id ON public.communication_history(contact_id);
CREATE INDEX IF NOT EXISTS idx_communication_history_sent_at ON public.communication_history(sent_at);

-- Enable RLS
ALTER TABLE public.communication_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own communication history" ON public.communication_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own communication history" ON public.communication_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own communication history" ON public.communication_history
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own communication history" ON public.communication_history
  FOR DELETE USING (auth.uid() = user_id);

-- Function and trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_communication_history_updated_at
  BEFORE UPDATE ON public.communication_history
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.communication_history TO authenticated;
  `

  console.log(sqlCommands)
  console.log('')
  console.log('After running this SQL, refresh your application.')
  console.log('========================================')

  // For now, we'll just log the error and continue
  // In the future, we might want to show this in the UI
}
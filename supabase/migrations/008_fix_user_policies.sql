-- =============================================
-- Fix User Table RLS Policies
-- Migration: 008_fix_user_policies.sql
-- =============================================

-- Add missing INSERT policy for users table
-- This allows authenticated users to create their own user record during signup
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
GRANT USAGE ON SCHEMA public TO authenticated;
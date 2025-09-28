-- =============================================
-- REMAINING MIGRATIONS TO APPLY
-- =============================================
-- This file contains all the remaining migrations that need to be applied
-- to your Supabase database. You can copy and paste this into your
-- Supabase SQL editor if the CLI is having connection issues.

-- =============================================
-- MIGRATION 003: Add Address Components (Safe)
-- =============================================

-- Add address component columns to properties table if they don't exist
DO $$ 
BEGIN
    -- Add street_number column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='properties' AND column_name='street_number') THEN
        ALTER TABLE public.properties ADD COLUMN street_number TEXT;
    END IF;

    -- Add street column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='properties' AND column_name='street') THEN
        ALTER TABLE public.properties ADD COLUMN street TEXT;
    END IF;

    -- Add suburb column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='properties' AND column_name='suburb') THEN
        ALTER TABLE public.properties ADD COLUMN suburb TEXT;
    END IF;

    -- Add city column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='properties' AND column_name='city') THEN
        ALTER TABLE public.properties ADD COLUMN city TEXT;
    END IF;

    -- Add region column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='properties' AND column_name='region') THEN
        ALTER TABLE public.properties ADD COLUMN region TEXT;
    END IF;

    -- Add postal_code column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='properties' AND column_name='postal_code') THEN
        ALTER TABLE public.properties ADD COLUMN postal_code TEXT;
    END IF;
END $$;

-- Add address component columns to contacts table if they don't exist
DO $$ 
BEGIN
    -- Add street_number column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='contacts' AND column_name='street_number') THEN
        ALTER TABLE public.contacts ADD COLUMN street_number TEXT;
    END IF;

    -- Add street column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='contacts' AND column_name='street') THEN
        ALTER TABLE public.contacts ADD COLUMN street TEXT;
    END IF;

    -- Add suburb column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='contacts' AND column_name='suburb') THEN
        ALTER TABLE public.contacts ADD COLUMN suburb TEXT;
    END IF;

    -- Add city column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='contacts' AND column_name='city') THEN
        ALTER TABLE public.contacts ADD COLUMN city TEXT;
    END IF;

    -- Add region column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='contacts' AND column_name='region') THEN
        ALTER TABLE public.contacts ADD COLUMN region TEXT;
    END IF;

    -- Add postal_code column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='contacts' AND column_name='postal_code') THEN
        ALTER TABLE public.contacts ADD COLUMN postal_code TEXT;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_properties_suburb ON public.properties(suburb);
CREATE INDEX IF NOT EXISTS idx_properties_city ON public.properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_postal_code ON public.properties(postal_code);
CREATE INDEX IF NOT EXISTS idx_contacts_suburb ON public.contacts(suburb);
CREATE INDEX IF NOT EXISTS idx_contacts_city ON public.contacts(city);
CREATE INDEX IF NOT EXISTS idx_contacts_postal_code ON public.contacts(postal_code);

-- =============================================
-- MIGRATION 004: Add SMS Category
-- =============================================

-- Add SMS category to templates table
ALTER TABLE public.templates 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'marketing' 
CHECK (category IN ('sold', 'marketing', 'listing', 'custom', 'follow_up', 'sms'));

-- =============================================
-- MIGRATION 005: Enhance Properties Schema
-- =============================================

-- Add additional property fields
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS floor_area NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS land_area_m2 NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS organisation TEXT,
ADD COLUMN IF NOT EXISTS sale_method TEXT;

-- =============================================
-- MIGRATION 006: Sample Data (Optional)
-- =============================================
-- This migration contains sample data - you can skip this if you don't want sample data

-- =============================================
-- MIGRATION 007: Create Communication History
-- =============================================

-- Create communication_history table
CREATE TABLE IF NOT EXISTS public.communication_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('sms', 'email', 'call', 'meeting', 'note')),
    content TEXT,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'read')),
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.communication_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage own communication history" ON public.communication_history
    FOR ALL USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_communication_history_user_id ON public.communication_history(user_id);
CREATE INDEX IF NOT EXISTS idx_communication_history_contact_id ON public.communication_history(contact_id);
CREATE INDEX IF NOT EXISTS idx_communication_history_property_id ON public.communication_history(property_id);
CREATE INDEX IF NOT EXISTS idx_communication_history_campaign_id ON public.communication_history(campaign_id);
CREATE INDEX IF NOT EXISTS idx_communication_history_sent_at ON public.communication_history(sent_at);

-- =============================================
-- MIGRATION 008: Fix User Policies
-- =============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Service role can manage users" ON public.users;

-- Recreate policies
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Service role can manage users" ON public.users
    FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- MIGRATION 009: Add Contact Type and Temperature
-- =============================================

-- Add contact_type and temperature columns to contacts table
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS contact_type TEXT DEFAULT 'buyer' 
CHECK (contact_type IN ('buyer', 'seller', 'both')),
ADD COLUMN IF NOT EXISTS temperature TEXT DEFAULT 'warm' 
CHECK (temperature IN ('hot', 'warm', 'cold'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_contacts_contact_type ON public.contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_contacts_temperature ON public.contacts(temperature);

-- =============================================
-- MIGRATION 010: Add Seller Property Fields
-- =============================================

-- Add property purchase fields to contacts table
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS property_purchase_date DATE,
ADD COLUMN IF NOT EXISTS property_purchase_price NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS property_address TEXT,
ADD COLUMN IF NOT EXISTS property_suburb TEXT,
ADD COLUMN IF NOT EXISTS property_city TEXT,
ADD COLUMN IF NOT EXISTS property_postal_code TEXT,
ADD COLUMN IF NOT EXISTS property_lat NUMERIC(10,8),
ADD COLUMN IF NOT EXISTS property_lng NUMERIC(11,8);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_contacts_property_purchase_date ON public.contacts(property_purchase_date);
CREATE INDEX IF NOT EXISTS idx_contacts_property_purchase_price ON public.contacts(property_purchase_price);
CREATE INDEX IF NOT EXISTS idx_contacts_property_address ON public.contacts(property_address);

-- Add constraint
ALTER TABLE public.contacts
ADD CONSTRAINT IF NOT EXISTS contacts_seller_property_check 
CHECK (
  (contact_type = 'seller' OR contact_type = 'both') OR 
  (property_purchase_date IS NULL AND property_purchase_price IS NULL AND property_address IS NULL)
);

-- =============================================
-- MIGRATION 011: Add Contact Name Fields
-- =============================================

-- Add first_name and last_name columns to contacts table
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contacts_first_name ON public.contacts(first_name);
CREATE INDEX IF NOT EXISTS idx_contacts_last_name ON public.contacts(last_name);

-- Migrate existing data: split name into first_name and last_name
UPDATE public.contacts 
SET 
  first_name = CASE 
    WHEN name ~ '^[A-Za-z]+$' THEN name  -- Single word becomes first name
    ELSE split_part(name, ' ', 1)        -- First word becomes first name
  END,
  last_name = CASE 
    WHEN name ~ '^[A-Za-z]+$' THEN NULL  -- Single word has no last name
    ELSE trim(substring(name from position(' ' in name) + 1))  -- Rest becomes last name
  END
WHERE first_name IS NULL OR last_name IS NULL;

-- Add constraint to ensure at least one name field is provided
ALTER TABLE public.contacts
ADD CONSTRAINT IF NOT EXISTS contacts_name_check 
CHECK (first_name IS NOT NULL OR last_name IS NOT NULL);

-- =============================================
-- MIGRATION 012: Add Missing Columns
-- =============================================

-- Add any missing columns that might be needed
-- This migration can be customized based on your specific needs

-- =============================================
-- COMPLETION MESSAGE
-- =============================================
SELECT 'All migrations applied successfully!' as status;

-- =============================================
-- Add Address Components to Properties Table (Safe Version)
-- =============================================

-- Add NZ address component fields to properties table (only if they don't exist)
DO $$
BEGIN
    -- Add street_number if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='properties' AND column_name='street_number') THEN
        ALTER TABLE public.properties ADD COLUMN street_number TEXT;
    END IF;

    -- Add street if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='properties' AND column_name='street') THEN
        ALTER TABLE public.properties ADD COLUMN street TEXT;
    END IF;

    -- Add suburb if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='properties' AND column_name='suburb') THEN
        ALTER TABLE public.properties ADD COLUMN suburb TEXT;
    END IF;

    -- Add city if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='properties' AND column_name='city') THEN
        ALTER TABLE public.properties ADD COLUMN city TEXT;
    END IF;

    -- Add region if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='properties' AND column_name='region') THEN
        ALTER TABLE public.properties ADD COLUMN region TEXT;
    END IF;

    -- Add postal_code if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='properties' AND column_name='postal_code') THEN
        ALTER TABLE public.properties ADD COLUMN postal_code TEXT;
    END IF;
END $$;

-- Add similar fields to contacts table (only if they don't exist)
DO $$
BEGIN
    -- Add street_number if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='contacts' AND column_name='street_number') THEN
        ALTER TABLE public.contacts ADD COLUMN street_number TEXT;
    END IF;

    -- Add street if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='contacts' AND column_name='street') THEN
        ALTER TABLE public.contacts ADD COLUMN street TEXT;
    END IF;

    -- Add suburb if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='contacts' AND column_name='suburb') THEN
        ALTER TABLE public.contacts ADD COLUMN suburb TEXT;
    END IF;

    -- Add city if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='contacts' AND column_name='city') THEN
        ALTER TABLE public.contacts ADD COLUMN city TEXT;
    END IF;

    -- Add region if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='contacts' AND column_name='region') THEN
        ALTER TABLE public.contacts ADD COLUMN region TEXT;
    END IF;

    -- Add postal_code if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='contacts' AND column_name='postal_code') THEN
        ALTER TABLE public.contacts ADD COLUMN postal_code TEXT;
    END IF;
END $$;

-- Add indexes for better performance on location-based queries (only if they don't exist)
DO $$
BEGIN
    -- Properties indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_properties_suburb') THEN
        CREATE INDEX idx_properties_suburb ON public.properties(suburb);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_properties_city') THEN
        CREATE INDEX idx_properties_city ON public.properties(city);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_properties_postal_code') THEN
        CREATE INDEX idx_properties_postal_code ON public.properties(postal_code);
    END IF;

    -- Contacts indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_contacts_suburb') THEN
        CREATE INDEX idx_contacts_suburb ON public.contacts(suburb);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_contacts_city') THEN
        CREATE INDEX idx_contacts_city ON public.contacts(city);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_contacts_postal_code') THEN
        CREATE INDEX idx_contacts_postal_code ON public.contacts(postal_code);
    END IF;
END $$;

-- Add comments for documentation
DO $$
BEGIN
    -- Only add comments if columns exist
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='properties' AND column_name='street_number') THEN
        COMMENT ON COLUMN public.properties.street_number IS 'Street number component of the address (e.g., "123")';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='properties' AND column_name='street') THEN
        COMMENT ON COLUMN public.properties.street IS 'Street name component of the address (e.g., "Main Street")';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='properties' AND column_name='suburb') THEN
        COMMENT ON COLUMN public.properties.suburb IS 'Suburb component of the address (e.g., "Ponsonby")';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='properties' AND column_name='city') THEN
        COMMENT ON COLUMN public.properties.city IS 'City/territorial authority component (e.g., "Auckland")';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='properties' AND column_name='region') THEN
        COMMENT ON COLUMN public.properties.region IS 'Region component of the address (e.g., "Auckland")';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='properties' AND column_name='postal_code') THEN
        COMMENT ON COLUMN public.properties.postal_code IS 'Postal code component (e.g., "1011")';
    END IF;

    -- Similar comments for contacts
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='contacts' AND column_name='street_number') THEN
        COMMENT ON COLUMN public.contacts.street_number IS 'Street number component of the address (e.g., "123")';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='contacts' AND column_name='street') THEN
        COMMENT ON COLUMN public.contacts.street IS 'Street name component of the address (e.g., "Main Street")';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='contacts' AND column_name='suburb') THEN
        COMMENT ON COLUMN public.contacts.suburb IS 'Suburb component of the address (e.g., "Ponsonby")';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='contacts' AND column_name='city') THEN
        COMMENT ON COLUMN public.contacts.city IS 'City/territorial authority component (e.g., "Auckland")';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='contacts' AND column_name='region') THEN
        COMMENT ON COLUMN public.contacts.region IS 'Region component of the address (e.g., "Auckland")';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='contacts' AND column_name='postal_code') THEN
        COMMENT ON COLUMN public.contacts.postal_code IS 'Postal code component (e.g., "1011")';
    END IF;
END $$;
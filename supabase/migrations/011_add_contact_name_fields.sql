-- =============================================
-- Add first_name and last_name fields to contacts table
-- =============================================

-- Add first_name and last_name columns
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
ADD CONSTRAINT contacts_name_check 
CHECK (first_name IS NOT NULL OR last_name IS NOT NULL);

-- Add comment explaining the migration
COMMENT ON COLUMN public.contacts.first_name IS 'Contact first name';
COMMENT ON COLUMN public.contacts.last_name IS 'Contact last name';
COMMENT ON COLUMN public.contacts.name IS 'Legacy full name field - use first_name and last_name instead';

-- Add missing columns to existing tables
-- =============================================

-- PROPERTIES TABLE - Add missing columns
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS bathrooms NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS listing_date DATE,
ADD COLUMN IF NOT EXISTS sold_date DATE;

-- Update status constraint to include 'withdrawn'
ALTER TABLE public.properties
DROP CONSTRAINT IF EXISTS properties_status_check;

ALTER TABLE public.properties
ADD CONSTRAINT properties_status_check
CHECK (status IN ('listed', 'sold', 'withdrawn'));

-- Add property_type constraint
ALTER TABLE public.properties
ADD CONSTRAINT properties_property_type_check
CHECK (property_type IN ('house', 'apartment', 'townhouse', 'land', 'commercial'));

-- CONTACTS TABLE - Add missing columns
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS suburb TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS follow_up_date DATE,
ADD COLUMN IF NOT EXISTS contact_source TEXT DEFAULT 'manual' CHECK (contact_source IN ('manual', 'import', 'campaign', 'referral')),
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- TEMPLATES TABLE - Add missing columns
ALTER TABLE public.templates
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'custom' CHECK (category IN ('listing', 'sold', 'follow_up', 'marketing', 'custom')),
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN public.properties.bathrooms IS 'Number of bathrooms (supports half bathrooms like 2.5)';
COMMENT ON COLUMN public.properties.description IS 'Property description and features';
COMMENT ON COLUMN public.properties.listing_date IS 'Date the property was listed';
COMMENT ON COLUMN public.properties.sold_date IS 'Date the property was sold';

COMMENT ON COLUMN public.contacts.suburb IS 'Contact suburb/area';
COMMENT ON COLUMN public.contacts.city IS 'Contact city';
COMMENT ON COLUMN public.contacts.postal_code IS 'Contact postal/zip code';
COMMENT ON COLUMN public.contacts.follow_up_date IS 'Date for next follow-up';
COMMENT ON COLUMN public.contacts.contact_source IS 'How the contact was acquired';
COMMENT ON COLUMN public.contacts.tags IS 'Array of contact tags';

COMMENT ON COLUMN public.templates.category IS 'Template category for organization';
COMMENT ON COLUMN public.templates.is_default IS 'Whether this is a default system template';
COMMENT ON COLUMN public.templates.usage_count IS 'Number of times template has been used';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON public.properties(user_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_source ON public.contacts(contact_source);
CREATE INDEX IF NOT EXISTS idx_contacts_follow_up ON public.contacts(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON public.templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON public.templates(category);
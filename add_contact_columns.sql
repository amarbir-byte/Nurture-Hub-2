-- Add contact_type and temperature columns to contacts table
-- Run this in your Supabase SQL editor

-- Add contact_type column (buyer, seller, both)
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS contact_type TEXT DEFAULT 'buyer' CHECK (contact_type IN ('buyer', 'seller', 'both'));

-- Add temperature column (hot, warm, cold)
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS temperature TEXT DEFAULT 'warm' CHECK (temperature IN ('hot', 'warm', 'cold'));

-- Add comments for documentation
COMMENT ON COLUMN public.contacts.contact_type IS 'Type of contact: buyer, seller, or both';
COMMENT ON COLUMN public.contacts.temperature IS 'Lead temperature: hot (very interested), warm (somewhat interested), cold (not interested)';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contacts_contact_type ON public.contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_contacts_temperature ON public.contacts(temperature);

-- Update existing contacts to have default values
UPDATE public.contacts 
SET 
  contact_type = 'buyer',
  temperature = 'warm'
WHERE contact_type IS NULL OR temperature IS NULL;

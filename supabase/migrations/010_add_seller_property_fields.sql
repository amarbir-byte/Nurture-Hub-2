-- Add property purchase information for seller contacts
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

-- Add comments for documentation
COMMENT ON COLUMN public.contacts.property_purchase_date IS 'Date when the seller purchased their property';
COMMENT ON COLUMN public.contacts.property_purchase_price IS 'Price the seller paid for their property';
COMMENT ON COLUMN public.contacts.property_address IS 'Address of the seller''s property';
COMMENT ON COLUMN public.contacts.property_suburb IS 'Suburb of the seller''s property';
COMMENT ON COLUMN public.contacts.property_city IS 'City of the seller''s property';
COMMENT ON COLUMN public.contacts.property_postal_code IS 'Postal code of the seller''s property';
COMMENT ON COLUMN public.contacts.property_lat IS 'Latitude of the seller''s property';
COMMENT ON COLUMN public.contacts.property_lng IS 'Longitude of the seller''s property';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contacts_property_purchase_date ON public.contacts(property_purchase_date);
CREATE INDEX IF NOT EXISTS idx_contacts_property_purchase_price ON public.contacts(property_purchase_price);
CREATE INDEX IF NOT EXISTS idx_contacts_property_address ON public.contacts(property_address);

-- Add constraint to ensure property fields are only filled for sellers
ALTER TABLE public.contacts
ADD CONSTRAINT contacts_seller_property_check 
CHECK (
  (contact_type = 'seller' OR contact_type = 'both') OR 
  (property_purchase_date IS NULL AND property_purchase_price IS NULL AND property_address IS NULL)
);

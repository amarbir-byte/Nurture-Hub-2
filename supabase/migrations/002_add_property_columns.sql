-- Add missing columns to properties table
-- =============================================

-- Add bathrooms column
ALTER TABLE public.properties
ADD COLUMN bathrooms NUMERIC(3,1);

-- Add description column
ALTER TABLE public.properties
ADD COLUMN description TEXT;

-- Add listing_date column
ALTER TABLE public.properties
ADD COLUMN listing_date DATE;

-- Add sold_date column
ALTER TABLE public.properties
ADD COLUMN sold_date DATE;

-- Update status check constraint to include 'withdrawn'
ALTER TABLE public.properties
DROP CONSTRAINT IF EXISTS properties_status_check;

ALTER TABLE public.properties
ADD CONSTRAINT properties_status_check
CHECK (status IN ('listed', 'sold', 'withdrawn'));

-- Update property_type check constraint
ALTER TABLE public.properties
DROP CONSTRAINT IF EXISTS properties_property_type_check;

ALTER TABLE public.properties
ADD CONSTRAINT properties_property_type_check
CHECK (property_type IN ('house', 'apartment', 'townhouse', 'land', 'commercial'));

-- Add comments for documentation
COMMENT ON COLUMN public.properties.bathrooms IS 'Number of bathrooms (supports half bathrooms like 2.5)';
COMMENT ON COLUMN public.properties.description IS 'Property description and features';
COMMENT ON COLUMN public.properties.listing_date IS 'Date the property was listed';
COMMENT ON COLUMN public.properties.sold_date IS 'Date the property was sold';
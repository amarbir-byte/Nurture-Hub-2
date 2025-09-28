-- Add SMS category to templates table
-- =============================================

-- Drop the existing category constraint
ALTER TABLE public.templates
DROP CONSTRAINT IF EXISTS templates_category_check;

-- Add new constraint that includes 'sms'
ALTER TABLE public.templates
ADD CONSTRAINT templates_category_check
CHECK (category IN ('listing', 'sold', 'follow_up', 'marketing', 'sms', 'custom'));

-- Update comment
COMMENT ON COLUMN public.templates.category IS 'Template category for organization (listing, sold, follow_up, marketing, sms, custom)';
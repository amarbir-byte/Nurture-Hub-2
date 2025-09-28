-- =============================================
-- Enhance Properties Table with REINZ Fields
-- Migration: 005_enhance_properties_schema.sql
-- =============================================

-- Add all REINZ export fields plus additional useful property fields
-- Using DO blocks to safely add columns only if they don't exist

DO $$ 
BEGIN
    -- Core address components (for composite address creation)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='street_number') THEN
        ALTER TABLE public.properties ADD COLUMN street_number TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='street') THEN
        ALTER TABLE public.properties ADD COLUMN street TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='suburb') THEN
        ALTER TABLE public.properties ADD COLUMN suburb TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='city') THEN
        ALTER TABLE public.properties ADD COLUMN city TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='region') THEN
        ALTER TABLE public.properties ADD COLUMN region TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='postal_code') THEN
        ALTER TABLE public.properties ADD COLUMN postal_code TEXT;
    END IF;

    -- Pricing information
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='sale_price') THEN
        ALTER TABLE public.properties ADD COLUMN sale_price NUMERIC(12,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='list_price') THEN
        ALTER TABLE public.properties ADD COLUMN list_price NUMERIC(12,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='valuation') THEN
        ALTER TABLE public.properties ADD COLUMN valuation NUMERIC(12,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='price_per_sqm') THEN
        ALTER TABLE public.properties ADD COLUMN price_per_sqm NUMERIC(10,2);
    END IF;

    -- Property details
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='floor_area') THEN
        ALTER TABLE public.properties ADD COLUMN floor_area NUMERIC(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='land_area_ha') THEN
        ALTER TABLE public.properties ADD COLUMN land_area_ha NUMERIC(10,4);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='land_area_m2') THEN
        ALTER TABLE public.properties ADD COLUMN land_area_m2 NUMERIC(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='building_area') THEN
        ALTER TABLE public.properties ADD COLUMN building_area NUMERIC(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='levels') THEN
        ALTER TABLE public.properties ADD COLUMN levels INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='garages') THEN
        ALTER TABLE public.properties ADD COLUMN garages INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='carports') THEN
        ALTER TABLE public.properties ADD COLUMN carports INTEGER;
    END IF;

    -- Date fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='sale_date') THEN
        ALTER TABLE public.properties ADD COLUMN sale_date DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='settlement_date') THEN
        ALTER TABLE public.properties ADD COLUMN settlement_date DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='agreement_date') THEN
        ALTER TABLE public.properties ADD COLUMN agreement_date DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='possession_date') THEN
        ALTER TABLE public.properties ADD COLUMN possession_date DATE;
    END IF;

    -- Sale information
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='days_to_sell') THEN
        ALTER TABLE public.properties ADD COLUMN days_to_sell INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='sale_category') THEN
        ALTER TABLE public.properties ADD COLUMN sale_category TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='sale_method') THEN
        ALTER TABLE public.properties ADD COLUMN sale_method TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='auction_date') THEN
        ALTER TABLE public.properties ADD COLUMN auction_date DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='tender_date') THEN
        ALTER TABLE public.properties ADD COLUMN tender_date DATE;
    END IF;

    -- Property characteristics
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='new_dwelling') THEN
        ALTER TABLE public.properties ADD COLUMN new_dwelling BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='sale_tenure') THEN
        ALTER TABLE public.properties ADD COLUMN sale_tenure TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='zoning') THEN
        ALTER TABLE public.properties ADD COLUMN zoning TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='year_built') THEN
        ALTER TABLE public.properties ADD COLUMN year_built INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='construction_material') THEN
        ALTER TABLE public.properties ADD COLUMN construction_material TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='heating_type') THEN
        ALTER TABLE public.properties ADD COLUMN heating_type TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='cooling_type') THEN
        ALTER TABLE public.properties ADD COLUMN cooling_type TEXT;
    END IF;

    -- Agent/Agency information
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='organisation') THEN
        ALTER TABLE public.properties ADD COLUMN organisation TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='agent_name') THEN
        ALTER TABLE public.properties ADD COLUMN agent_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='agent_phone') THEN
        ALTER TABLE public.properties ADD COLUMN agent_phone TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='agent_email') THEN
        ALTER TABLE public.properties ADD COLUMN agent_email TEXT;
    END IF;

    -- Additional fields for comprehensive property management
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='property_features') THEN
        ALTER TABLE public.properties ADD COLUMN property_features TEXT[];
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='nearby_amenities') THEN
        ALTER TABLE public.properties ADD COLUMN nearby_amenities TEXT[];
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='council_rates') THEN
        ALTER TABLE public.properties ADD COLUMN council_rates NUMERIC(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='body_corporate_fees') THEN
        ALTER TABLE public.properties ADD COLUMN body_corporate_fees NUMERIC(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='rental_potential') THEN
        ALTER TABLE public.properties ADD COLUMN rental_potential NUMERIC(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='investment_yield') THEN
        ALTER TABLE public.properties ADD COLUMN investment_yield NUMERIC(5,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='capital_growth') THEN
        ALTER TABLE public.properties ADD COLUMN capital_growth NUMERIC(5,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='condition_rating') THEN
        ALTER TABLE public.properties ADD COLUMN condition_rating INTEGER CHECK (condition_rating BETWEEN 1 AND 5);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='energy_rating') THEN
        ALTER TABLE public.properties ADD COLUMN energy_rating TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='water_rating') THEN
        ALTER TABLE public.properties ADD COLUMN water_rating TEXT;
    END IF;

    -- Marketing and notes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='marketing_notes') THEN
        ALTER TABLE public.properties ADD COLUMN marketing_notes TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='internal_notes') THEN
        ALTER TABLE public.properties ADD COLUMN internal_notes TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='public_listing') THEN
        ALTER TABLE public.properties ADD COLUMN public_listing BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='featured_property') THEN
        ALTER TABLE public.properties ADD COLUMN featured_property BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='virtual_tour_url') THEN
        ALTER TABLE public.properties ADD COLUMN virtual_tour_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='video_url') THEN
        ALTER TABLE public.properties ADD COLUMN video_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='image_urls') THEN
        ALTER TABLE public.properties ADD COLUMN image_urls TEXT[];
    END IF;

    -- Compliance and legal
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='compliance_certificates') THEN
        ALTER TABLE public.properties ADD COLUMN compliance_certificates TEXT[];
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='building_consent') THEN
        ALTER TABLE public.properties ADD COLUMN building_consent TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='code_compliance_certificate') THEN
        ALTER TABLE public.properties ADD COLUMN code_compliance_certificate TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='chattels_included') THEN
        ALTER TABLE public.properties ADD COLUMN chattels_included TEXT[];
    END IF;

    -- Location enhancements
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='google_place_id') THEN
        ALTER TABLE public.properties ADD COLUMN google_place_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='formatted_address') THEN
        ALTER TABLE public.properties ADD COLUMN formatted_address TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='neighborhood') THEN
        ALTER TABLE public.properties ADD COLUMN neighborhood TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='school_zones') THEN
        ALTER TABLE public.properties ADD COLUMN school_zones TEXT[];
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='transport_links') THEN
        ALTER TABLE public.properties ADD COLUMN transport_links TEXT[];
    END IF;

END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_properties_sale_price ON public.properties(sale_price);
CREATE INDEX IF NOT EXISTS idx_properties_list_price ON public.properties(list_price);
CREATE INDEX IF NOT EXISTS idx_properties_sale_date ON public.properties(sale_date);
CREATE INDEX IF NOT EXISTS idx_properties_organisation ON public.properties(organisation);
CREATE INDEX IF NOT EXISTS idx_properties_year_built ON public.properties(year_built);
CREATE INDEX IF NOT EXISTS idx_properties_condition_rating ON public.properties(condition_rating);
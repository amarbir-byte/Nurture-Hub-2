-- =============================================
-- Enhance Properties Table with REINZ Fields
-- Migration: 002_enhance_properties_schema.sql
-- =============================================

-- Add all REINZ export fields plus additional useful property fields
ALTER TABLE public.properties
-- Core address components (for composite address creation)
ADD COLUMN street_number TEXT,
ADD COLUMN street TEXT,
ADD COLUMN suburb TEXT,
ADD COLUMN city TEXT,
ADD COLUMN region TEXT,
ADD COLUMN postal_code TEXT,

-- Pricing information
ADD COLUMN sale_price NUMERIC(12,2),
ADD COLUMN list_price NUMERIC(12,2),
ADD COLUMN valuation NUMERIC(12,2),
ADD COLUMN price_per_sqm NUMERIC(10,2),

-- Property details
-- Note: bathrooms, description, listing_date, sold_date already added in 003_add_missing_columns.sql
ADD COLUMN floor_area NUMERIC(10,2), -- in square meters
ADD COLUMN land_area_ha NUMERIC(10,4), -- in hectares
ADD COLUMN land_area_m2 NUMERIC(10,2), -- in square meters
ADD COLUMN building_area NUMERIC(10,2), -- in square meters
ADD COLUMN levels INTEGER,
ADD COLUMN garages INTEGER,
ADD COLUMN carports INTEGER,

-- Date fields
-- Note: listing_date, sold_date already added in 003_add_missing_columns.sql
ADD COLUMN sale_date DATE,
ADD COLUMN settlement_date DATE,
ADD COLUMN agreement_date DATE,
ADD COLUMN possession_date DATE,

-- Sale information
ADD COLUMN days_to_sell INTEGER,
ADD COLUMN sale_category TEXT,
ADD COLUMN sale_method TEXT,
ADD COLUMN auction_date DATE,
ADD COLUMN tender_date DATE,

-- Property characteristics
ADD COLUMN new_dwelling BOOLEAN DEFAULT FALSE,
ADD COLUMN sale_tenure TEXT,
ADD COLUMN zoning TEXT,
ADD COLUMN year_built INTEGER,
ADD COLUMN construction_material TEXT,
ADD COLUMN heating_type TEXT,
ADD COLUMN cooling_type TEXT,

-- Agent/Agency information
ADD COLUMN organisation TEXT,
ADD COLUMN agent_name TEXT,
ADD COLUMN agent_phone TEXT,
ADD COLUMN agent_email TEXT,

-- Additional fields for comprehensive property management
ADD COLUMN property_features TEXT[], -- Array of features like "Pool", "Garden", "Garage"
ADD COLUMN nearby_amenities TEXT[], -- Array of nearby amenities
ADD COLUMN council_rates NUMERIC(10,2), -- Annual council rates
ADD COLUMN body_corporate_fees NUMERIC(10,2), -- Monthly/annual fees
ADD COLUMN rental_potential NUMERIC(10,2), -- Weekly rental estimate
ADD COLUMN investment_yield NUMERIC(5,2), -- Percentage yield
ADD COLUMN capital_growth NUMERIC(5,2), -- Percentage growth
ADD COLUMN condition_rating INTEGER CHECK (condition_rating BETWEEN 1 AND 5),
ADD COLUMN energy_rating TEXT,
ADD COLUMN water_rating TEXT,

-- Marketing and notes
ADD COLUMN marketing_notes TEXT,
ADD COLUMN internal_notes TEXT,
ADD COLUMN public_listing BOOLEAN DEFAULT FALSE,
ADD COLUMN featured_property BOOLEAN DEFAULT FALSE,
ADD COLUMN virtual_tour_url TEXT,
ADD COLUMN video_url TEXT,
ADD COLUMN image_urls TEXT[], -- Array of image URLs

-- Compliance and legal
ADD COLUMN compliance_certificates TEXT[],
ADD COLUMN building_consent TEXT,
ADD COLUMN code_compliance_certificate TEXT,
ADD COLUMN chattels_included TEXT[],

-- Location enhancements
ADD COLUMN google_place_id TEXT,
ADD COLUMN formatted_address TEXT,
ADD COLUMN neighborhood TEXT,
ADD COLUMN school_zones TEXT[],
ADD COLUMN transport_links TEXT[];

-- Update the status check constraint to include 'withdrawn'
ALTER TABLE public.properties
DROP CONSTRAINT IF EXISTS properties_status_check;

ALTER TABLE public.properties
ADD CONSTRAINT properties_status_check
CHECK (status IN ('listed', 'sold', 'withdrawn', 'off_market', 'pre_market', 'auction', 'tender'));

-- Add check constraints for ratings
ALTER TABLE public.properties
ADD CONSTRAINT valid_investment_yield CHECK (investment_yield >= 0 AND investment_yield <= 100),
ADD CONSTRAINT valid_capital_growth CHECK (capital_growth >= -100 AND capital_growth <= 1000);

-- =============================================
-- INDEXES for Enhanced Performance
-- =============================================

-- Price range searches
CREATE INDEX idx_properties_price_range ON public.properties(price) WHERE price IS NOT NULL;
CREATE INDEX idx_properties_sale_price_range ON public.properties(sale_price) WHERE sale_price IS NOT NULL;
CREATE INDEX idx_properties_list_price_range ON public.properties(list_price) WHERE list_price IS NOT NULL;

-- Date-based searches
CREATE INDEX idx_properties_listing_date ON public.properties(listing_date) WHERE listing_date IS NOT NULL;
CREATE INDEX idx_properties_sale_date ON public.properties(sale_date) WHERE sale_date IS NOT NULL;
CREATE INDEX idx_properties_sold_date ON public.properties(sold_date) WHERE sold_date IS NOT NULL;

-- Property characteristics
CREATE INDEX idx_properties_bedrooms ON public.properties(bedrooms) WHERE bedrooms IS NOT NULL;
-- Note: bathrooms index not created here as bathrooms column was added in 003_add_missing_columns.sql
CREATE INDEX idx_properties_property_type ON public.properties(property_type) WHERE property_type IS NOT NULL;

-- Area-based searches
CREATE INDEX idx_properties_floor_area ON public.properties(floor_area) WHERE floor_area IS NOT NULL;
CREATE INDEX idx_properties_land_area_m2 ON public.properties(land_area_m2) WHERE land_area_m2 IS NOT NULL;

-- Location components
CREATE INDEX idx_properties_suburb ON public.properties(suburb) WHERE suburb IS NOT NULL;
CREATE INDEX idx_properties_city ON public.properties(city) WHERE city IS NOT NULL;

-- Investment properties
CREATE INDEX idx_properties_rental_potential ON public.properties(rental_potential) WHERE rental_potential IS NOT NULL;
CREATE INDEX idx_properties_investment_yield ON public.properties(investment_yield) WHERE investment_yield IS NOT NULL;

-- Public listings
CREATE INDEX idx_properties_public_listing ON public.properties(public_listing) WHERE public_listing = TRUE;
CREATE INDEX idx_properties_featured ON public.properties(featured_property) WHERE featured_property = TRUE;

-- Array field indexes (GIN indexes for efficient array searches)
CREATE INDEX idx_properties_features ON public.properties USING GIN(property_features) WHERE property_features IS NOT NULL;
CREATE INDEX idx_properties_amenities ON public.properties USING GIN(nearby_amenities) WHERE nearby_amenities IS NOT NULL;
CREATE INDEX idx_properties_school_zones ON public.properties USING GIN(school_zones) WHERE school_zones IS NOT NULL;

-- =============================================
-- UTILITY FUNCTIONS for Enhanced Properties
-- =============================================

-- Function to calculate price per square meter
CREATE OR REPLACE FUNCTION public.calculate_price_per_sqm(property_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    prop_price NUMERIC;
    prop_floor_area NUMERIC;
    result NUMERIC;
BEGIN
    SELECT
        COALESCE(sale_price, price, list_price),
        floor_area
    INTO prop_price, prop_floor_area
    FROM public.properties
    WHERE id = property_id;

    IF prop_price IS NOT NULL AND prop_floor_area IS NOT NULL AND prop_floor_area > 0 THEN
        result := prop_price / prop_floor_area;
        RETURN ROUND(result, 2);
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate investment yield
CREATE OR REPLACE FUNCTION public.calculate_investment_yield(property_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    prop_price NUMERIC;
    weekly_rent NUMERIC;
    annual_rent NUMERIC;
    result NUMERIC;
BEGIN
    SELECT
        COALESCE(sale_price, price, list_price),
        rental_potential
    INTO prop_price, weekly_rent
    FROM public.properties
    WHERE id = property_id;

    IF prop_price IS NOT NULL AND weekly_rent IS NOT NULL AND prop_price > 0 THEN
        annual_rent := weekly_rent * 52;
        result := (annual_rent / prop_price) * 100;
        RETURN ROUND(result, 2);
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to create formatted address from components
CREATE OR REPLACE FUNCTION public.format_property_address(property_id UUID)
RETURNS TEXT AS $$
DECLARE
    addr_components RECORD;
    formatted_addr TEXT := '';
BEGIN
    SELECT
        street_number, street, suburb, city, postal_code
    INTO addr_components
    FROM public.properties
    WHERE id = property_id;

    -- Build address string
    IF addr_components.street_number IS NOT NULL THEN
        formatted_addr := addr_components.street_number;
    END IF;

    IF addr_components.street IS NOT NULL THEN
        IF formatted_addr != '' THEN
            formatted_addr := formatted_addr || ' ';
        END IF;
        formatted_addr := formatted_addr || addr_components.street;
    END IF;

    IF addr_components.suburb IS NOT NULL THEN
        IF formatted_addr != '' THEN
            formatted_addr := formatted_addr || ', ';
        END IF;
        formatted_addr := formatted_addr || addr_components.suburb;
    END IF;

    IF addr_components.city IS NOT NULL THEN
        IF formatted_addr != '' THEN
            formatted_addr := formatted_addr || ', ';
        END IF;
        formatted_addr := formatted_addr || addr_components.city;
    END IF;

    IF addr_components.postal_code IS NOT NULL THEN
        IF formatted_addr != '' THEN
            formatted_addr := formatted_addr || ' ';
        END IF;
        formatted_addr := formatted_addr || addr_components.postal_code;
    END IF;

    RETURN formatted_addr;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update calculated fields
CREATE OR REPLACE FUNCTION public.update_property_calculated_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Update price per square meter
    IF NEW.floor_area IS NOT NULL AND (NEW.price IS NOT NULL OR NEW.sale_price IS NOT NULL OR NEW.list_price IS NOT NULL) THEN
        NEW.price_per_sqm := (COALESCE(NEW.sale_price, NEW.price, NEW.list_price) / NEW.floor_area);
    END IF;

    -- Update investment yield if both price and rental potential exist
    IF NEW.rental_potential IS NOT NULL AND (NEW.price IS NOT NULL OR NEW.sale_price IS NOT NULL OR NEW.list_price IS NOT NULL) THEN
        NEW.investment_yield := ((NEW.rental_potential * 52) / COALESCE(NEW.sale_price, NEW.price, NEW.list_price)) * 100;
    END IF;

    -- Auto-format address if components exist but formatted_address is empty
    IF NEW.formatted_address IS NULL AND (NEW.street_number IS NOT NULL OR NEW.street IS NOT NULL OR NEW.suburb IS NOT NULL) THEN
        NEW.formatted_address := CONCAT_WS(' ', NEW.street_number, NEW.street, NEW.suburb, NEW.city, NEW.postal_code);
    END IF;

    -- Use formatted_address as main address if address is empty
    IF NEW.address IS NULL AND NEW.formatted_address IS NOT NULL THEN
        NEW.address := NEW.formatted_address;
    END IF;

    -- Calculate days to sell if both dates exist
    IF NEW.listing_date IS NOT NULL AND NEW.sale_date IS NOT NULL THEN
        NEW.days_to_sell := NEW.sale_date - NEW.listing_date;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for calculated fields
CREATE TRIGGER update_property_calculated_fields_trigger
    BEFORE INSERT OR UPDATE ON public.properties
    FOR EACH ROW
    EXECUTE FUNCTION public.update_property_calculated_fields();

-- =============================================
-- COMMENTS for New Fields
-- =============================================

-- Enhanced field comments
COMMENT ON COLUMN public.properties.street_number IS 'Street number component of address';
COMMENT ON COLUMN public.properties.street IS 'Street name component of address';
COMMENT ON COLUMN public.properties.suburb IS 'Suburb/area component of address';
COMMENT ON COLUMN public.properties.sale_price IS 'Actual sale price (REINZ field)';
COMMENT ON COLUMN public.properties.list_price IS 'Listed/asking price (REINZ field)';
COMMENT ON COLUMN public.properties.valuation IS 'Professional valuation amount (REINZ field)';
COMMENT ON COLUMN public.properties.days_to_sell IS 'Number of days from listing to sale (REINZ field)';
COMMENT ON COLUMN public.properties.sale_category IS 'Category of sale: Normal Sale, Mortgagee, etc. (REINZ field)';
COMMENT ON COLUMN public.properties.sale_method IS 'Method of sale: Auction, Private Treaty, etc. (REINZ field)';
COMMENT ON COLUMN public.properties.new_dwelling IS 'Whether property is a new dwelling (REINZ field)';
COMMENT ON COLUMN public.properties.sale_tenure IS 'Tenure type: Freehold, Leasehold, etc. (REINZ field)';
COMMENT ON COLUMN public.properties.organisation IS 'Real estate agency/organization (REINZ field)';
COMMENT ON COLUMN public.properties.floor_area IS 'Floor area in square meters (REINZ field)';
COMMENT ON COLUMN public.properties.land_area_ha IS 'Land area in hectares (REINZ field)';
COMMENT ON COLUMN public.properties.land_area_m2 IS 'Land area in square meters (REINZ field)';
COMMENT ON COLUMN public.properties.property_features IS 'Array of property features like Pool, Garden, etc.';
COMMENT ON COLUMN public.properties.rental_potential IS 'Estimated weekly rental income';
COMMENT ON COLUMN public.properties.investment_yield IS 'Calculated rental yield percentage';
COMMENT ON COLUMN public.properties.condition_rating IS 'Property condition rating 1-5 (1=Poor, 5=Excellent)';
COMMENT ON COLUMN public.properties.public_listing IS 'Whether property is publicly visible';
COMMENT ON COLUMN public.properties.featured_property IS 'Whether property is featured/highlighted';

-- Note: Comments for bathrooms, description, listing_date, sold_date are in 003_add_missing_columns.sql
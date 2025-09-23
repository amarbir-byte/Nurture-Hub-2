-- =============================================
-- Nurture Hub Database Schema
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable RLS
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE public.users (
    id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    stripe_customer_id TEXT UNIQUE,
    subscription_status TEXT CHECK (subscription_status IN ('trialing', 'active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'unpaid')),
    plan_type TEXT CHECK (plan_type IN ('starter', 'professional', 'enterprise')),
    unlimited_access BOOLEAN DEFAULT FALSE,
    trial_end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Allow service role to manage all user data
CREATE POLICY "Service role can manage users" ON public.users
    FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- PROPERTIES TABLE
-- =============================================
CREATE TABLE public.properties (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    address TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('listed', 'sold')),
    price NUMERIC(12,2),
    bedrooms INTEGER,
    property_type TEXT,
    lat NUMERIC(10,8),
    lng NUMERIC(11,8),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for properties
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own properties" ON public.properties
    FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- CONTACTS TABLE
-- =============================================
CREATE TABLE public.contacts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    lat NUMERIC(10,8),
    lng NUMERIC(11,8),
    last_contact_date TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for contacts
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own contacts" ON public.contacts
    FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- CAMPAIGNS TABLE
-- =============================================
CREATE TABLE public.campaigns (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    recipients_count INTEGER NOT NULL DEFAULT 0,
    radius NUMERIC(6,3) NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    campaign_type TEXT DEFAULT 'sms' CHECK (campaign_type IN ('sms', 'email')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for campaigns
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own campaigns" ON public.campaigns
    FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- TEMPLATES TABLE
-- =============================================
CREATE TABLE public.templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    placeholders TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for templates
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own templates" ON public.templates
    FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- CONTACT INTERACTIONS TABLE
-- =============================================
CREATE TABLE public.contact_interactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('sms', 'call', 'email', 'note')),
    notes TEXT,
    follow_up_date TIMESTAMPTZ,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for contact interactions
ALTER TABLE public.contact_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own contact interactions" ON public.contact_interactions
    FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- USAGE TRACKING TABLE
-- =============================================
CREATE TABLE public.usage_tracking (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    feature TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for usage tracking
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage" ON public.usage_tracking
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage usage tracking" ON public.usage_tracking
    FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- SUBSCRIPTIONS TABLE (for Stripe webhook data)
-- =============================================
CREATE TABLE public.subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    stripe_subscription_id TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    plan_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions
    FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- INDEXES for Performance
-- =============================================

-- Users table indexes
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_stripe_customer_id ON public.users(stripe_customer_id);

-- Properties table indexes
CREATE INDEX idx_properties_user_id ON public.properties(user_id);
CREATE INDEX idx_properties_status ON public.properties(status);
CREATE INDEX idx_properties_location ON public.properties(lat, lng);

-- Contacts table indexes
CREATE INDEX idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX idx_contacts_location ON public.contacts(lat, lng);
CREATE INDEX idx_contacts_last_contact ON public.contacts(last_contact_date);

-- Campaigns table indexes
CREATE INDEX idx_campaigns_user_id ON public.campaigns(user_id);
CREATE INDEX idx_campaigns_property_id ON public.campaigns(property_id);
CREATE INDEX idx_campaigns_sent_at ON public.campaigns(sent_at);

-- Templates table indexes
CREATE INDEX idx_templates_user_id ON public.templates(user_id);

-- Contact interactions table indexes
CREATE INDEX idx_contact_interactions_user_id ON public.contact_interactions(user_id);
CREATE INDEX idx_contact_interactions_contact_id ON public.contact_interactions(contact_id);
CREATE INDEX idx_contact_interactions_follow_up ON public.contact_interactions(follow_up_date) WHERE follow_up_date IS NOT NULL;

-- Usage tracking table indexes
CREATE INDEX idx_usage_tracking_user_id ON public.usage_tracking(user_id);
CREATE INDEX idx_usage_tracking_period ON public.usage_tracking(period_start, period_end);

-- Subscriptions table indexes
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id);

-- =============================================
-- TRIGGERS for updated_at timestamps
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER handle_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_properties_updated_at
    BEFORE UPDATE ON public.properties
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_contacts_updated_at
    BEFORE UPDATE ON public.contacts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_templates_updated_at
    BEFORE UPDATE ON public.templates
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- UTILITY FUNCTIONS
-- =============================================

-- Function to check if user has unlimited access or active subscription
CREATE OR REPLACE FUNCTION public.user_has_access(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_record RECORD;
BEGIN
    SELECT unlimited_access, subscription_status, trial_end_date
    INTO user_record
    FROM public.users
    WHERE id = user_uuid;

    -- Check if user has unlimited access
    IF user_record.unlimited_access = TRUE THEN
        RETURN TRUE;
    END IF;

    -- Check if user has active subscription
    IF user_record.subscription_status IN ('active', 'trialing') THEN
        -- If trialing, check if trial hasn't expired
        IF user_record.subscription_status = 'trialing' THEN
            RETURN user_record.trial_end_date > NOW();
        END IF;
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's current usage for a feature
CREATE OR REPLACE FUNCTION public.get_user_usage(user_uuid UUID, feature_name TEXT)
RETURNS INTEGER AS $$
DECLARE
    usage_count INTEGER := 0;
    month_start TIMESTAMPTZ;
    month_end TIMESTAMPTZ;
BEGIN
    -- Get current month boundaries
    month_start := date_trunc('month', NOW());
    month_end := month_start + INTERVAL '1 month';

    CASE feature_name
        WHEN 'contacts' THEN
            SELECT COUNT(*) INTO usage_count
            FROM public.contacts
            WHERE user_id = user_uuid;

        WHEN 'campaigns_per_month' THEN
            SELECT COUNT(*) INTO usage_count
            FROM public.campaigns
            WHERE user_id = user_uuid
            AND created_at >= month_start
            AND created_at < month_end;

        WHEN 'templates' THEN
            SELECT COUNT(*) INTO usage_count
            FROM public.templates
            WHERE user_id = user_uuid;

        ELSE
            usage_count := 0;
    END CASE;

    RETURN COALESCE(usage_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- INITIAL DATA
-- =============================================

-- Insert some default SMS templates for new users
CREATE OR REPLACE FUNCTION public.create_default_templates(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.templates (user_id, name, content, placeholders) VALUES
    (user_uuid, 'New Listing Alert', 'Hi [HomeownerName]! A new property just listed at [Address] for [Price]. Similar to your home? I''d love to discuss your property''s value. Call me at [AgentPhone].', ARRAY['HomeownerName', 'Address', 'Price', 'AgentPhone']),
    (user_uuid, 'Recent Sale Notification', 'Hello [HomeownerName], a property at [Address] just sold for [Price]. Want to know what your home is worth in this market? Free valuation available. Reply for details!', ARRAY['HomeownerName', 'Address', 'Price']),
    (user_uuid, 'Market Update', 'Hi [HomeownerName], the market in your area is [MarketCondition]. Properties like yours at [Address] are [MarketTrend]. Interested in your home''s current value?', ARRAY['HomeownerName', 'Address', 'MarketCondition', 'MarketTrend']);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- COMMENTS for Documentation
-- =============================================

COMMENT ON TABLE public.users IS 'User accounts with subscription and access control';
COMMENT ON TABLE public.properties IS 'Real estate properties (listings and sales)';
COMMENT ON TABLE public.contacts IS 'Homeowner contacts for marketing campaigns';
COMMENT ON TABLE public.campaigns IS 'SMS/Email marketing campaigns sent to contacts';
COMMENT ON TABLE public.templates IS 'Reusable message templates with placeholders';
COMMENT ON TABLE public.contact_interactions IS 'Log of all interactions with contacts';
COMMENT ON TABLE public.usage_tracking IS 'Track feature usage for subscription limits';
COMMENT ON TABLE public.subscriptions IS 'Stripe subscription data synchronized via webhooks';

COMMENT ON COLUMN public.users.unlimited_access IS 'Admin flag to bypass all subscription limits';
COMMENT ON COLUMN public.properties.lat IS 'Latitude coordinate for proximity searches';
COMMENT ON COLUMN public.properties.lng IS 'Longitude coordinate for proximity searches';
COMMENT ON COLUMN public.contacts.lat IS 'Latitude coordinate for proximity searches';
COMMENT ON COLUMN public.contacts.lng IS 'Longitude coordinate for proximity searches';
COMMENT ON COLUMN public.campaigns.radius IS 'Search radius in kilometers for campaign';
COMMENT ON COLUMN public.templates.placeholders IS 'Array of placeholder names like [HomeownerName]';
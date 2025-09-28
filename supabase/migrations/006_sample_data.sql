-- =============================================
-- Sample Data for Development and Testing
-- =============================================

-- This file contains sample data to help with development and testing
-- It should be run after the initial schema migration

-- =============================================
-- SAMPLE PROPERTIES DATA
-- =============================================

-- Function to create sample properties for a user
CREATE OR REPLACE FUNCTION public.create_sample_properties(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.properties (user_id, address, status, price, bedrooms, property_type, lat, lng) VALUES
    -- Auckland Properties
    (user_uuid, '123 Queen Street, Auckland Central', 'listed', 850000, 2, 'Apartment', -36.8485, 174.7633),
    (user_uuid, '456 Ponsonby Road, Ponsonby', 'sold', 1200000, 3, 'House', -36.8606, 174.7482),
    (user_uuid, '789 Remuera Road, Remuera', 'listed', 1800000, 4, 'House', -36.8733, 174.7885),
    (user_uuid, '321 Karangahape Road, Auckland', 'sold', 920000, 2, 'Apartment', -36.8581, 174.7594),

    -- Wellington Properties
    (user_uuid, '45 Lambton Quay, Wellington Central', 'listed', 650000, 1, 'Apartment', -41.2865, 174.7762),
    (user_uuid, '67 Oriental Parade, Oriental Bay', 'sold', 1100000, 2, 'Apartment', -41.2956, 174.7931),
    (user_uuid, '89 The Terrace, Wellington', 'listed', 480000, 1, 'Apartment', -41.2888, 174.7772),

    -- Christchurch Properties
    (user_uuid, '78 Cashel Street, Christchurch Central', 'sold', 420000, 2, 'Apartment', -43.5321, 172.6362),
    (user_uuid, '234 Riccarton Road, Riccarton', 'listed', 580000, 3, 'House', -43.5320, 172.5908),
    (user_uuid, '345 Memorial Avenue, Burnside', 'sold', 750000, 4, 'House', -43.5062, 172.5674);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- SAMPLE CONTACTS DATA
-- =============================================

-- Function to create sample contacts for a user
CREATE OR REPLACE FUNCTION public.create_sample_contacts(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.contacts (user_id, name, address, phone, email, lat, lng, last_contact_date, notes) VALUES
    -- Auckland Contacts
    (user_uuid, 'John Smith', '100 Queen Street, Auckland Central', '+64 21 123 4567', 'john.smith@email.com', -36.8475, 174.7635, NOW() - INTERVAL '5 days', 'Interested in market updates'),
    (user_uuid, 'Sarah Johnson', '200 Ponsonby Road, Ponsonby', '+64 21 234 5678', 'sarah.johnson@email.com', -36.8596, 174.7472, NOW() - INTERVAL '2 weeks', 'Potential seller - house needs renovation'),
    (user_uuid, 'Mike Wilson', '150 Remuera Road, Remuera', '+64 21 345 6789', 'mike.wilson@email.com', -36.8723, 174.7875, NULL, 'New contact from open home'),
    (user_uuid, 'Lisa Brown', '300 Karangahape Road, Auckland', '+64 21 456 7890', 'lisa.brown@email.com', -36.8571, 174.7584, NOW() - INTERVAL '1 week', 'Follow up about property valuation'),

    -- Wellington Contacts
    (user_uuid, 'David Taylor', '50 Lambton Quay, Wellington Central', '+64 21 567 8901', 'david.taylor@email.com', -41.2855, 174.7752, NOW() - INTERVAL '3 days', 'Looking to buy apartment'),
    (user_uuid, 'Emma Davis', '70 Oriental Parade, Oriental Bay', '+64 21 678 9012', 'emma.davis@email.com', -41.2946, 174.7921, NOW() - INTERVAL '1 month', 'Considering selling in 6 months'),
    (user_uuid, 'James Miller', '90 The Terrace, Wellington', '+64 21 789 0123', 'james.miller@email.com', -41.2878, 174.7762, NULL, 'First home buyer'),

    -- Christchurch Contacts
    (user_uuid, 'Anna White', '80 Cashel Street, Christchurch Central', '+64 21 890 1234', 'anna.white@email.com', -43.5311, 172.6352, NOW() - INTERVAL '4 days', 'Elderly couple looking to downsize'),
    (user_uuid, 'Peter Green', '250 Riccarton Road, Riccarton', '+64 21 901 2345', 'peter.green@email.com', -43.5310, 172.5898, NOW() - INTERVAL '1 week', 'Young family needs bigger house'),
    (user_uuid, 'Rachel Adams', '350 Memorial Avenue, Burnside', '+64 21 012 3456', 'rachel.adams@email.com', -43.5052, 172.5664, NULL, 'Investor looking for rental properties');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- SAMPLE CAMPAIGNS DATA
-- =============================================

-- Function to create sample campaigns for a user
CREATE OR REPLACE FUNCTION public.create_sample_campaigns(user_uuid UUID)
RETURNS VOID AS $$
DECLARE
    property_id UUID;
BEGIN
    -- Get a sample property ID
    SELECT id INTO property_id FROM public.properties WHERE user_id = user_uuid LIMIT 1;

    IF property_id IS NOT NULL THEN
        INSERT INTO public.campaigns (user_id, property_id, message, recipients_count, radius, sent_at, campaign_type) VALUES
        (user_uuid, property_id, 'New listing alert! A beautiful 2-bedroom apartment just listed at 123 Queen Street for $850,000. Interested in your property value?', 15, 1.0, NOW() - INTERVAL '2 days', 'sms'),
        (user_uuid, property_id, 'Market update: Properties in your area are selling 10% above asking price. Want to know what your home is worth?', 25, 2.5, NOW() - INTERVAL '1 week', 'sms'),
        (user_uuid, property_id, 'Just sold! A property similar to yours at Ponsonby Road sold for $1.2M. Curious about your home''s value in this market?', 18, 1.5, NOW() - INTERVAL '3 days', 'sms');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- SAMPLE CONTACT INTERACTIONS DATA
-- =============================================

-- Function to create sample contact interactions for a user
CREATE OR REPLACE FUNCTION public.create_sample_interactions(user_uuid UUID)
RETURNS VOID AS $$
DECLARE
    contact_id UUID;
BEGIN
    -- Get a sample contact ID
    SELECT id INTO contact_id FROM public.contacts WHERE user_id = user_uuid LIMIT 1;

    IF contact_id IS NOT NULL THEN
        INSERT INTO public.contact_interactions (user_id, contact_id, type, notes, follow_up_date, completed) VALUES
        (user_uuid, contact_id, 'call', 'Called to discuss market conditions. Interested in property valuation.', NOW() + INTERVAL '1 week', FALSE),
        (user_uuid, contact_id, 'sms', 'Sent market update SMS. Good response rate.', NULL, TRUE),
        (user_uuid, contact_id, 'email', 'Followed up with detailed market report.', NOW() + INTERVAL '2 weeks', FALSE),
        (user_uuid, contact_id, 'note', 'Client mentioned they might sell in 6 months. Set reminder to follow up.', NOW() + INTERVAL '5 months', FALSE);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- MASTER FUNCTION TO CREATE ALL SAMPLE DATA
-- =============================================

CREATE OR REPLACE FUNCTION public.create_sample_data_for_user(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- Create default templates
    PERFORM public.create_default_templates(user_uuid);

    -- Create sample properties
    PERFORM public.create_sample_properties(user_uuid);

    -- Create sample contacts
    PERFORM public.create_sample_contacts(user_uuid);

    -- Create sample campaigns
    PERFORM public.create_sample_campaigns(user_uuid);

    -- Create sample interactions
    PERFORM public.create_sample_interactions(user_uuid);

    RAISE NOTICE 'Sample data created successfully for user %', user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- USAGE EXAMPLE
-- =============================================

-- To create sample data for a specific user, run:
-- SELECT public.create_sample_data_for_user('user-uuid-here');

-- To create sample data for the current authenticated user:
-- SELECT public.create_sample_data_for_user(auth.uid());

-- =============================================
-- CLEANUP FUNCTION (for development)
-- =============================================

CREATE OR REPLACE FUNCTION public.cleanup_sample_data(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.contact_interactions WHERE user_id = user_uuid;
    DELETE FROM public.campaigns WHERE user_id = user_uuid;
    DELETE FROM public.contacts WHERE user_id = user_uuid;
    DELETE FROM public.properties WHERE user_id = user_uuid;
    DELETE FROM public.templates WHERE user_id = user_uuid;

    RAISE NOTICE 'Sample data cleaned up for user %', user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
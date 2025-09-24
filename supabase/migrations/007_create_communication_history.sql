-- =============================================
-- Communication History Table
-- Migration: 007_create_communication_history.sql
-- =============================================

-- Create communication_history table to track all communications
CREATE TABLE public.communication_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Contact information
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL, -- Store name for historical record even if contact is deleted
  contact_email TEXT,
  contact_phone TEXT,

  -- Property information (optional - for property-related communications)
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  property_address TEXT, -- Store address for historical record

  -- Communication details
  communication_type TEXT NOT NULL CHECK (communication_type IN ('email', 'text', 'call', 'meeting', 'note')),
  subject TEXT,
  message TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed', 'scheduled')),

  -- Context and metadata
  context TEXT, -- 'property_alert', 'market_update', 'follow_up', 'general', etc.
  related_properties UUID[], -- Array of property IDs mentioned in communication
  tags TEXT[], -- For categorization and filtering

  -- Timestamps
  scheduled_at TIMESTAMP WITH TIME ZONE, -- For scheduled communications
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_communication_history_user_id ON public.communication_history(user_id);
CREATE INDEX idx_communication_history_contact_id ON public.communication_history(contact_id);
CREATE INDEX idx_communication_history_property_id ON public.communication_history(property_id);
CREATE INDEX idx_communication_history_type ON public.communication_history(communication_type);
CREATE INDEX idx_communication_history_status ON public.communication_history(status);
CREATE INDEX idx_communication_history_context ON public.communication_history(context);
CREATE INDEX idx_communication_history_sent_at ON public.communication_history(sent_at);
CREATE INDEX idx_communication_history_tags ON public.communication_history USING GIN(tags);
CREATE INDEX idx_communication_history_related_properties ON public.communication_history USING GIN(related_properties);

-- RLS policies
ALTER TABLE public.communication_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own communication history
CREATE POLICY "Users can view own communication history" ON public.communication_history
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own communication history
CREATE POLICY "Users can insert own communication history" ON public.communication_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own communication history
CREATE POLICY "Users can update own communication history" ON public.communication_history
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own communication history
CREATE POLICY "Users can delete own communication history" ON public.communication_history
  FOR DELETE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_communication_history_updated_at
  BEFORE UPDATE ON public.communication_history
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.communication_history TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
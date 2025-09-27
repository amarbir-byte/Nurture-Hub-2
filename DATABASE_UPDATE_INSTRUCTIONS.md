# Database Update Instructions

## Issue
The production Supabase database is missing the `contact_type` and `temperature` columns that were added to the contacts table. This is causing a 400 error when trying to save contacts.

## Solution
Run the SQL script to add the missing columns to your production database.

## Steps

### 1. Access Supabase Dashboard
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project: `danbkfdqwprutyzlvnid`
3. Navigate to the **SQL Editor** tab

### 2. Run the Migration Script
Copy and paste the following SQL into the SQL Editor and run it:

```sql
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
```

### 3. Verify the Changes
After running the script, verify that the columns were added:

```sql
-- Check if columns exist
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'contacts' 
AND column_name IN ('contact_type', 'temperature');
```

### 4. Test the Application
1. Go back to your application
2. Try to create or edit a contact
3. The contact type and temperature fields should now work without errors

## Alternative: Using Supabase CLI (if you have access)

If you have access to link the Supabase CLI to your project:

1. **Get your project reference:**
   - From your Supabase dashboard URL: `https://supabase.com/dashboard/project/danbkfdqwprutyzlvnid`
   - The project reference is: `danbkfdqwprutyzlvnid`

2. **Link the project:**
   ```bash
   npx supabase link --project-ref danbkfdqwprutyzlvnid
   ```

3. **Push the migration:**
   ```bash
   npx supabase db push
   ```

## What This Fixes

- Adds `contact_type` column with values: 'buyer', 'seller', 'both'
- Adds `temperature` column with values: 'hot', 'warm', 'cold'
- Sets default values for existing contacts
- Adds database indexes for better performance
- Enables the new contact form fields to work properly

## After the Update

Once the columns are added, the contact form will work with:
- Contact type selection (Buyer/Seller/Both)
- Temperature selection (Hot/Warm/Cold)
- Filtering and sorting by these new fields
- Import functionality for these fields

The error `Could not find the 'contact_type' column` should be resolved.

# Manual Migration Guide

## 🚨 CLI Connection Issues

The Supabase CLI is experiencing connection issues. This is a common problem that can occur due to:
- Network connectivity issues
- Database being paused
- Authentication token expiration
- Regional server issues

## ✅ Recommended Solution: Manual SQL Application

Since the CLI is not working reliably, we'll apply the remaining migrations manually through the Supabase Dashboard.

### Step 1: Access Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/danbkfdqwprutyzlvnid
2. Click on **"SQL Editor"** in the left sidebar
3. Click **"New Query"**

### Step 2: Apply Remaining Migrations

Copy and paste the following SQL files one by one into the SQL editor and run them:

#### Migration 005: Enhanced Properties Schema
```sql
-- Copy the entire content of: supabase/migrations/005_enhance_properties_schema.sql
```

#### Migration 006: Sample Data (Optional)
```sql
-- Copy the entire content of: supabase/migrations/006_sample_data.sql
-- Note: This adds sample data - you can skip if you don't want it
```

#### Migration 007: Communication History
```sql
-- Copy the entire content of: supabase/migrations/007_create_communication_history.sql
```

#### Migration 008: Fix User Policies
```sql
-- Copy the entire content of: supabase/migrations/008_fix_user_policies.sql
```

#### Migration 009: Contact Type and Temperature
```sql
-- Copy the entire content of: supabase/migrations/009_add_contact_type_and_temperature.sql
```

#### Migration 010: Seller Property Fields
```sql
-- Copy the entire content of: supabase/migrations/010_add_seller_property_fields.sql
```

#### Migration 011: Contact Name Fields
```sql
-- Copy the entire content of: supabase/migrations/011_add_contact_name_fields.sql
```

#### Migration 012: Missing Columns
```sql
-- Copy the entire content of: supabase/migrations/012_add_missing_columns.sql
```

### Step 3: Alternative - Use Consolidated SQL

Instead of applying each migration individually, you can use the consolidated file:

1. Open `REMAINING_MIGRATIONS.sql` in your project
2. Copy the entire content
3. Paste it into the Supabase SQL Editor
4. Run it all at once

This approach is safer because it includes all the necessary checks for existing columns.

### Step 4: Verify Migration Success

After applying the migrations, verify they worked by:

1. Go to **"Table Editor"** in the Supabase Dashboard
2. Check that the following tables have the new columns:
   - `properties` table should have new address and property fields
   - `contacts` table should have `contact_type`, `temperature`, `first_name`, `last_name`, and seller property fields
   - `templates` table should have `category` field
   - `communication_history` table should exist

### Step 5: Update Migration History (Optional)

If you want to sync the CLI migration history later, you can run:

```bash
# When CLI connection is restored
supabase migration repair --status applied 005
supabase migration repair --status applied 006
supabase migration repair --status applied 007
supabase migration repair --status applied 008
supabase migration repair --status applied 009
supabase migration repair --status applied 010
supabase migration repair --status applied 011
supabase migration repair --status applied 012
```

## 🎯 What These Migrations Add

### Properties Table Enhancements
- Address components (street_number, street, suburb, city, region, postal_code)
- Pricing information (sale_price, list_price, valuation, price_per_sqm)
- Property details (floor_area, land_area, levels, garages, etc.)
- Date fields (sale_date, settlement_date, agreement_date, etc.)
- Sale information (days_to_sell, sale_category, sale_method, etc.)
- Property characteristics (new_dwelling, zoning, year_built, etc.)
- Agent information (organisation, agent_name, agent_phone, etc.)
- Marketing fields (property_features, marketing_notes, etc.)
- Compliance fields (building_consent, certificates, etc.)

### Contacts Table Enhancements
- Contact categorization (contact_type: buyer/seller/both)
- Temperature tracking (hot/warm/cold)
- Name fields (first_name, last_name)
- Seller property information (purchase_date, purchase_price, property_address, etc.)

### New Tables
- `communication_history` - Track all communications with contacts

### Template Enhancements
- SMS category support

## 🚀 Benefits of Manual Approach

1. **More Reliable**: No CLI connection issues
2. **Immediate Feedback**: See results instantly in the dashboard
3. **Error Handling**: Better error messages in the SQL editor
4. **Rollback Capability**: Can easily undo changes if needed
5. **Visual Confirmation**: See tables and columns being created

## 📞 Support

If you encounter any issues:
1. Check the Supabase Dashboard for error messages
2. Verify your project is not paused
3. Try refreshing the dashboard
4. Contact Supabase support if needed

The manual approach is actually preferred by many developers for its reliability and immediate feedback!

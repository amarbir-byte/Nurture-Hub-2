# Supabase CLI Setup Guide

## Prerequisites
- Supabase CLI is installed (✅ Done)
- Access to your Supabase project dashboard

## Step 1: Authentication
You need to authenticate with Supabase CLI. Run this command in your terminal:

```bash
supabase login
```

This will open a browser window for authentication. Follow the prompts to complete the login.

## Step 2: Link Your Project
Once authenticated, link your local project to the remote Supabase project:

```bash
supabase link --project-ref danbkfdqwprutyzlvnid
```

## Step 3: Verify Connection
Test the connection:

```bash
supabase projects list
```

You should see your project listed.

## Step 4: Database Management Commands

### Push Local Migrations to Remote
```bash
supabase db push
```

### Pull Remote Schema Changes
```bash
supabase db pull
```

### Generate New Migration
```bash
supabase migration new "description_of_changes"
```

### Reset Local Database
```bash
supabase db reset
```

### View Migration Status
```bash
supabase migration list
```

## Step 5: Local Development (Optional)
If you want to run Supabase locally for development:

```bash
# Start local Supabase (requires Docker)
supabase start

# Stop local Supabase
supabase stop
```

## Current Migration Files
Your project has the following migrations ready to be applied:

1. `001_initial_schema.sql` - Initial database schema
2. `002_add_property_columns.sql` - Property enhancements
3. `002_enhance_properties_schema.sql` - More property fields
4. `002_sample_data.sql` - Sample data
5. `003_add_address_components_safe.sql` - Address components
6. `003_add_missing_columns.sql` - Missing columns
7. `004_add_sms_category.sql` - SMS template category
8. `007_create_communication_history.sql` - Communication history
9. `008_fix_user_policies.sql` - User policies
10. `009_add_contact_type_and_temperature.sql` - Contact categorization
11. `010_add_seller_property_fields.sql` - Seller property info
12. `011_add_contact_name_fields.sql` - First/last name fields

## Next Steps
1. Run `supabase login` to authenticate
2. Run `supabase link --project-ref danbkfdqwprutyzlvnid` to link your project
3. Run `supabase db push` to apply all pending migrations

## Troubleshooting
- If you get "Cannot connect to Docker daemon" errors, make sure Docker is running
- If authentication fails, try clearing your browser cache and cookies
- If linking fails, verify your project reference is correct

## Environment Variables
Make sure your `.env` file contains:
```
VITE_SUPABASE_URL=https://danbkfdqwprutyzlvnid.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

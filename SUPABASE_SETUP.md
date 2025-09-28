# Supabase Database Setup & Migration Guide

This guide covers setting up and managing the Supabase database for Nurture Hub, including troubleshooting common issues.

## 🚀 Quick Start

### 1. Prerequisites
```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase
# or
brew install supabase/tap/supabase

# Verify installation
supabase --version
```

### 2. Authentication & Linking
```bash
# Login to Supabase (one-time setup)
supabase login

# Link to the project (already done, but for reference)
supabase link --project-ref danbkfdqwprutyzlvnid
```

### 3. Check Current Status
```bash
# Check migration status
npm run db:status

# Validate pending migrations
npm run db:validate
```

## 📋 Migration Commands

### Safe Migration (Recommended)
```bash
# Apply all pending migrations safely
npm run db:push

# Check what migrations are pending
npm run db:status

# Validate migrations for safety issues
npm run db:validate

# Create backup before migrations
npm run db:backup
```

### Manual Migration (When CLI fails)
```bash
# List all pending migrations
npm run db:manual list-pending

# Show content of specific migration
npm run db:manual show 005_enhance_properties_schema.sql

# Get all migrations in one file for dashboard
npm run db:manual all
```

### Other Useful Commands
```bash
# Generate TypeScript types
npm run db:types

# Start local development
npm run db:start

# Access database studio
npm run db:studio

# Create new migration
npm run db:new "description_of_changes"
```

## 🔧 Troubleshooting

### Connection Issues (Current Problem)

**Symptoms:**
- `connection refused` errors
- `failed to connect as temp role`
- CLI timeouts

**Solutions:**

#### Option 1: Manual Migration via Dashboard (Recommended)
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/danbkfdqwprutyzlvnid)
2. Navigate to **SQL Editor**
3. Run migrations one by one:
   ```bash
   npm run db:manual show 005_enhance_properties_schema.sql
   ```
4. Copy the output and paste in SQL Editor
5. Click **Run**
6. Repeat for all pending migrations (005-012)

#### Option 2: Fix CLI Connection
```bash
# Re-authenticate
supabase logout
supabase login

# Check network/firewall settings
# Ensure port 6543 is not blocked

# Try with different DNS resolver
supabase db push --dns-resolver https

# Use direct database URL (get from dashboard)
supabase db push --db-url "postgresql://postgres:[password]@db.danbkfdqwprutyzlvnid.supabase.co:5432/postgres"
```

#### Option 3: Use psql Directly
```bash
# Get connection string from Supabase Dashboard > Settings > Database
# Look for "Connection string" and use the "Direct connection" version

psql "postgresql://postgres:[password]@db.danbkfdqwprutyzlvnid.supabase.co:5432/postgres"

# Then run migrations manually:
\\i supabase/migrations/005_enhance_properties_schema.sql
\\i supabase/migrations/006_sample_data.sql
# ... continue for all pending migrations
```

### Common Error Messages

#### "Cannot connect to Docker daemon"
- **Cause:** Docker Desktop not running
- **Solution:** Start Docker Desktop (only needed for local development)
- **Alternative:** Use remote-only commands: `supabase db push` (not `supabase start`)

#### "Project not linked"
```bash
supabase link --project-ref danbkfdqwprutyzlvnid
```

#### "Access token expired"
```bash
supabase logout
supabase login
```

#### "Migration conflicts"
- Check for schema conflicts in dashboard
- Use `npm run db:validate` to identify issues
- Resolve manually in SQL Editor

## 🛡️ Safe Migration Practices

Our migration system includes several safety features:

### 1. Validation Checks
- ✅ Checks for `IF NOT EXISTS` clauses
- ✅ Validates `WHERE` clauses in DELETE statements
- ✅ Identifies potentially destructive operations
- ✅ Ensures proper transaction handling

### 2. Backup Strategy
- ✅ Creates backups before applying migrations
- ✅ Stores backups with timestamps
- ✅ Provides rollback mechanisms

### 3. Safe SQL Patterns
```sql
-- ✅ Good: Safe column addition
IF NOT EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_name='users' AND column_name='new_field') THEN
    ALTER TABLE users ADD COLUMN new_field TEXT;
END IF;

-- ✅ Good: Safe deletion
DELETE FROM table_name WHERE specific_condition;

-- ❌ Avoid: Unsafe operations
DROP TABLE users;  -- Should be: DROP TABLE IF EXISTS users;
DELETE FROM table_name;  -- Missing WHERE clause
```

## 📊 Current Migration Status

**Applied Migrations (001-004):**
- ✅ 001_initial_schema.sql
- ✅ 002_add_property_columns.sql
- ✅ 003_add_address_components_safe.sql
- ✅ 004_add_sms_category.sql

**Pending Migrations (005-012):**
- ⏳ 005_enhance_properties_schema.sql
- ⏳ 006_sample_data.sql
- ⏳ 007_create_communication_history.sql
- ⏳ 008_fix_user_policies.sql
- ⏳ 009_add_contact_type_and_temperature.sql
- ⏳ 010_add_seller_property_fields.sql
- ⏳ 011_add_contact_name_fields.sql
- ⏳ 012_add_missing_columns.sql

## 🔄 Post-Migration Steps

After applying migrations:

1. **Generate Types:**
   ```bash
   npm run db:types
   ```

2. **Test Application:**
   ```bash
   npm run dev
   ```

3. **Verify Database:**
   ```bash
   npm run db:studio  # Opens Supabase Studio
   ```

4. **Check Migration Status:**
   ```bash
   npm run db:status
   ```

## 📞 Support

If you continue to have issues:

1. **Check Supabase Status:** https://status.supabase.com/
2. **Network Issues:** Try different network/VPN
3. **CLI Issues:** Use manual migration via dashboard
4. **Database Issues:** Check Supabase Dashboard for errors

## 🔗 Useful Links

- [Supabase Dashboard](https://supabase.com/dashboard/project/danbkfdqwprutyzlvnid)
- [SQL Editor](https://supabase.com/dashboard/project/danbkfdqwprutyzlvnid/sql)
- [Database Settings](https://supabase.com/dashboard/project/danbkfdqwprutyzlvnid/settings/database)
- [Supabase CLI Docs](https://supabase.com/docs/reference/cli/introduction)
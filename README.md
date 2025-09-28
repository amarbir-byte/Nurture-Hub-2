# 🏠 Nurture Hub - Real Estate CRM & Proximity Marketing

**Proximity-based marketing CRM for real estate agents. 50% cheaper than kvCORE with better results.**

## 🚀 Live Demo
**Beta Testing URL**: https://nurture-hub.vercel.app

*Contact beta@nurturehub.app for testing access*

## 🎯 Key Features
- Proximity marketing within 0.1km-5km radius
- Complete CRM with contact & property management  
- SMS template system with dynamic placeholders
- Subscription billing with usage tracking
- Mobile-first PWA with offline sync

## 🏗️ Tech Stack
- React + TypeScript + Vite
- Supabase (PostgreSQL + Auth)
- Stripe subscriptions
- Vercel deployment
- Tailwind CSS + PWA

## 💰 Pricing
- Starter: $29/month (100 contacts, 50 campaigns)
- Professional: $79/month (1000 contacts, 200 campaigns)  
- Enterprise: $199/month (unlimited)
- 14-day free trial

## 🧪 Beta Testing
Currently seeking 5-8 real estate agents for user acceptance testing.

**Beta Benefits:**
- 30-day extended trial
- Direct founder support
- 50% first-year discount
- Shape product roadmap

Contact: beta@nurturehub.app

## 🗄️ Enterprise Database Management

### 🚀 Auto-Migration System (NEW!)
```bash
# 🤖 Auto-detect schema changes from TypeScript types
npm run db:auto detect

# 📝 Auto-generate migrations from code changes
npm run db:auto generate

# ⚡ Full auto-migration (detect + generate + types)
npm run db:auto auto
```

### 🏢 Enterprise Operations
```bash
# 🚀 Deploy to different environments
npm run db:enterprise deploy staging
npm run db:enterprise deploy production

# 🔄 Automated rollbacks
npm run db:enterprise rollback 013_add_social_media.sql

# 📸 Create environment snapshots
npm run db:enterprise snapshot production

# 🔍 Detect schema drift
npm run db:enterprise drift production

# 🧪 Test all migrations
npm run db:test ci
```

### 🛡️ Safe Migration Commands
```bash
# Check migration status
npm run db:status

# Apply all pending migrations safely
npm run db:push

# Validate migrations for safety issues
npm run db:validate

# Create database backup
npm run db:backup
```

### 🔧 Manual Migration (If CLI Issues)
```bash
# List pending migrations for manual application
npm run db:manual list-pending

# Get SQL content for specific migration
npm run db:manual show 005_enhance_properties_schema.sql

# Get all pending migrations combined
npm run db:manual all
```

### ✨ Key Features

#### 🤖 Automatic Schema Generation
- **Code-First Approach**: Define schema in TypeScript, auto-generate SQL
- **Change Detection**: Automatically detects when you add/remove fields
- **Type Safety**: Full TypeScript integration with compile-time validation

#### 🏢 Enterprise-Grade Features
- **Environment Management**: Separate dev/staging/prod pipelines
- **Automated Rollbacks**: One-command rollback with auto-generated SQL
- **Schema Drift Detection**: Alerts when code and DB are out of sync
- **Performance Testing**: Benchmarks migration execution time
- **CI/CD Integration**: Automated testing in build pipelines

#### 🛡️ Safety & Reliability
- **Transaction Wrapping**: All migrations in safe transaction blocks
- **Backup Creation**: Auto-backups before destructive operations
- **Conflict Resolution**: IF NOT EXISTS patterns prevent conflicts
- **Validation Checks**: Pre-migration safety analysis

#### 📊 Monitoring & Analytics
- **Migration Testing**: Comprehensive test suite for all migrations
- **Performance Monitoring**: Track migration execution times
- **Error Reporting**: Detailed error logs and recovery suggestions

### 📝 Example Workflow

```bash
# 1. Add new field to TypeScript interface
# interface Contact {
#   socialMediaHandle?: string  // ✅ New field
# }

# 2. Auto-detect and generate migration
npm run db:auto auto

# 3. Test the migration
npm run db:test ci

# 4. Deploy to staging
npm run db:enterprise deploy staging

# 5. Deploy to production (after testing)
npm run db:enterprise deploy production
```

**📋 Current Status:** 8 migrations pending (005-012)

**🔧 Troubleshooting:** See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed setup and troubleshooting guide.

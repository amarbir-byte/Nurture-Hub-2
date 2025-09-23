# Supabase Database Setup for Nurture Hub

## Quick Setup Instructions

### 1. Run the Initial Schema Migration

Copy and paste the contents of `migrations/001_initial_schema.sql` into your Supabase SQL editor:

1. Go to your Supabase dashboard: https://app.supabase.com/project/yzjferttqvaxcmnihpri
2. Navigate to **SQL Editor** in the left sidebar
3. Create a new query
4. Copy and paste the entire contents of `001_initial_schema.sql`
5. Click **Run** to execute

This will create:
- ✅ All database tables with proper relationships
- ✅ Row Level Security (RLS) policies for data isolation
- ✅ Indexes for optimal performance
- ✅ Utility functions for access control and usage tracking
- ✅ Triggers for automatic timestamp updates

### 2. Add Sample Data (Optional)

For development and testing, you can add sample data:

1. Copy and paste the contents of `migrations/002_sample_data.sql`
2. Run it in the SQL editor
3. Then run this command to create sample data for your user:
   ```sql
   SELECT public.create_sample_data_for_user(auth.uid());
   ```

This will create sample:
- 🏠 Properties (listings and sales)
- 👥 Contacts (homeowners)
- 📱 SMS campaigns
- 💬 SMS templates
- 📝 Contact interactions

## Database Schema Overview

### Core Tables:

1. **users** - User accounts with subscription info
2. **properties** - Real estate listings and sales
3. **contacts** - Homeowner contacts for marketing
4. **campaigns** - SMS/email marketing campaigns
5. **templates** - Reusable message templates
6. **contact_interactions** - Log of all contact activities
7. **subscriptions** - Stripe subscription data
8. **usage_tracking** - Feature usage for plan limits

### Security Features:

- **Row Level Security (RLS)** - Users can only access their own data
- **Service Role Access** - Allows backend operations via Stripe webhooks
- **Unlimited Access Flag** - Admin users bypass all restrictions

### Performance Features:

- **Optimized Indexes** - Fast queries for proximity searches and filtering
- **Automatic Timestamps** - created_at and updated_at managed automatically
- **Usage Tracking** - Real-time monitoring of subscription plan limits

## Utility Functions

### Check User Access
```sql
SELECT public.user_has_access(auth.uid());
```

### Get Current Usage
```sql
SELECT public.get_user_usage(auth.uid(), 'contacts');
SELECT public.get_user_usage(auth.uid(), 'campaigns_per_month');
SELECT public.get_user_usage(auth.uid(), 'templates');
```

### Create Sample Data
```sql
SELECT public.create_sample_data_for_user(auth.uid());
```

### Cleanup Sample Data
```sql
SELECT public.cleanup_sample_data(auth.uid());
```

## Next Steps

After running the migrations:

1. ✅ **Test Authentication** - Try signing up a new user
2. ✅ **Verify RLS** - Ensure users can only see their own data
3. ✅ **Add Stripe Keys** - Configure Stripe for subscription management
4. ✅ **Test Proximity Search** - Verify geocoding and distance calculations work

## Troubleshooting

### Common Issues:

1. **Permission Denied Errors**
   - Make sure RLS policies are created correctly
   - Check that auth.uid() returns the correct user ID

2. **Missing Tables**
   - Ensure 001_initial_schema.sql ran completely without errors
   - Check for any constraint violations

3. **Sample Data Issues**
   - Run sample data migration before trying to create sample data
   - Make sure you're authenticated when running sample data functions

### Verify Setup:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Check your user ID
SELECT auth.uid();
```
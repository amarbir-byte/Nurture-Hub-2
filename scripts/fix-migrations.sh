#!/bin/bash

# Fix Migration Conflicts Script
# This script helps resolve migration conflicts and connection issues

echo "🔧 Supabase Migration Fix Script"
echo "================================"

# Check if we're connected
echo "🔍 Checking connection to Supabase..."
if supabase migration list > /dev/null 2>&1; then
    echo "✅ Connected to Supabase"
    
    echo "📋 Current migration status:"
    supabase migration list
    
    echo ""
    echo "🔧 Repairing migration history..."
    
    # Repair migrations that are already applied
    for migration in 003 004 005 006 007 008 009 010 011 012; do
        echo "Repairing migration $migration..."
        if supabase migration repair --status applied $migration; then
            echo "✅ Migration $migration repaired"
        else
            echo "⚠️  Migration $migration repair failed (might already be applied)"
        fi
    done
    
    echo ""
    echo "📋 Updated migration status:"
    supabase migration list
    
    echo ""
    echo "🚀 Attempting to push remaining migrations..."
    if supabase db push; then
        echo "✅ All migrations applied successfully!"
    else
        echo "❌ Some migrations failed. Check the output above."
    fi
    
else
    echo "❌ Cannot connect to Supabase"
    echo ""
    echo "🔧 Troubleshooting steps:"
    echo "1. Check your internet connection"
    echo "2. Verify Supabase project is not paused"
    echo "3. Try logging in again: supabase login"
    echo "4. Check project status at: https://supabase.com/dashboard/project/danbkfdqwprutyzlvnid"
    echo ""
    echo "📝 Alternative approach:"
    echo "You can manually apply the remaining migrations using the SQL files:"
    echo "- 003_add_address_components_safe.sql"
    echo "- 004_add_sms_category.sql"
    echo "- 005_enhance_properties_schema.sql"
    echo "- 006_sample_data.sql"
    echo "- 007_create_communication_history.sql"
    echo "- 008_fix_user_policies.sql"
    echo "- 009_add_contact_type_and_temperature.sql"
    echo "- 010_add_seller_property_fields.sql"
    echo "- 011_add_contact_name_fields.sql"
    echo "- 012_add_missing_columns.sql"
    echo ""
    echo "Copy and paste these SQL files into your Supabase SQL editor."
fi

#!/bin/bash

# Supabase CLI Setup Script for Nurture Hub
# This script helps you set up Supabase CLI for database management

echo "🚀 Setting up Supabase CLI for Nurture Hub"
echo "=========================================="

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew install supabase/tap/supabase
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        curl -fsSL https://supabase.com/install.sh | sh
    else
        echo "❌ Unsupported operating system. Please install Supabase CLI manually."
        echo "   Visit: https://supabase.com/docs/guides/cli/getting-started"
        exit 1
    fi
else
    echo "✅ Supabase CLI is already installed"
fi

# Check version
echo "📋 Supabase CLI version:"
supabase --version

echo ""
echo "🔐 Next steps:"
echo "1. Run: supabase login"
echo "2. Run: supabase link --project-ref danbkfdqwprutyzlvnid"
echo "3. Run: npm run db:push (to apply all migrations)"
echo ""
echo "📖 For more help, see: SUPABASE_CLI_SETUP.md"
echo ""
echo "🎉 Setup complete! You can now manage your database with:"
echo "   npm run db:push    - Apply migrations"
echo "   npm run db:status  - Check status"
echo "   npm run db:pull    - Pull remote changes"
echo "   npm run db:new     - Create new migration"

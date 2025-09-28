#!/usr/bin/env node

/**
 * Manual Migration Script for Supabase
 *
 * Use this when CLI connection issues prevent automatic migrations.
 * This script helps you apply migrations manually through the Supabase Dashboard.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function listMigrations() {
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.log('❌ Migrations directory not found');
    return [];
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  return files;
}

function readMigration(filename) {
  const filepath = path.join(__dirname, '..', 'supabase', 'migrations', filename);
  return fs.readFileSync(filepath, 'utf8');
}

function main() {
  console.log('🔧 Manual Migration Helper');
  console.log('==========================\n');

  const command = process.argv[2];

  if (command === 'list-pending') {
    console.log('📋 Pending migrations (005-012):');
    console.log('Run these in Supabase Dashboard > SQL Editor:\n');

    const pendingMigrations = [
      '005_enhance_properties_schema.sql',
      '006_sample_data.sql',
      '007_create_communication_history.sql',
      '008_fix_user_policies.sql',
      '009_add_contact_type_and_temperature.sql',
      '010_add_seller_property_fields.sql',
      '011_add_contact_name_fields.sql',
      '012_add_missing_columns.sql'
    ];

    pendingMigrations.forEach((migration, index) => {
      console.log(`${index + 1}. ${migration}`);
    });

    console.log('\n📖 Instructions:');
    console.log('1. Go to https://supabase.com/dashboard/project/danbkfdqwprutyzlvnid');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run each migration file in order');
    console.log('4. Use: npm run db:manual show <filename> to see content');

  } else if (command === 'show') {
    const filename = process.argv[3];
    if (!filename) {
      console.log('❌ Please provide a migration filename');
      console.log('   Example: npm run db:manual show 005_enhance_properties_schema.sql');
      return;
    }

    try {
      const content = readMigration(filename);
      console.log(`📄 Content of ${filename}:`);
      console.log('=' + '='.repeat(filename.length + 11));
      console.log(content);
      console.log('=' + '='.repeat(filename.length + 11));
      console.log('\n📋 Copy the above SQL and run it in Supabase Dashboard > SQL Editor');
    } catch (error) {
      console.log(`❌ Could not read migration file: ${filename}`);
    }

  } else if (command === 'all') {
    console.log('📄 All pending migrations combined:');
    console.log('==================================\n');

    const pendingMigrations = [
      '005_enhance_properties_schema.sql',
      '006_sample_data.sql',
      '007_create_communication_history.sql',
      '008_fix_user_policies.sql',
      '009_add_contact_type_and_temperature.sql',
      '010_add_seller_property_fields.sql',
      '011_add_contact_name_fields.sql',
      '012_add_missing_columns.sql'
    ];

    pendingMigrations.forEach(migration => {
      try {
        const content = readMigration(migration);
        console.log(`-- ========================================`);
        console.log(`-- Migration: ${migration}`);
        console.log(`-- ========================================\n`);
        console.log(content);
        console.log('\n');
      } catch (error) {
        console.log(`-- ❌ Could not read: ${migration}\n`);
      }
    });

    console.log('📋 Copy the above SQL and run it in Supabase Dashboard > SQL Editor');

  } else {
    console.log('📖 Available commands:');
    console.log('   list-pending  - List all pending migrations');
    console.log('   show <file>   - Show content of specific migration');
    console.log('   all           - Show all pending migrations combined');
    console.log('\n📝 Examples:');
    console.log('   npm run db:manual list-pending');
    console.log('   npm run db:manual show 005_enhance_properties_schema.sql');
    console.log('   npm run db:manual all');
    console.log('\n🔧 Alternative Migration Methods:');
    console.log('1. Supabase Dashboard (Recommended):');
    console.log('   - Go to Dashboard > SQL Editor');
    console.log('   - Run migrations one by one');
    console.log('2. Direct psql connection:');
    console.log('   - Get connection string from Dashboard');
    console.log('   - Run: psql "connection_string" < migration.sql');
    console.log('3. Fix CLI connection:');
    console.log('   - Check firewall/VPN settings');
    console.log('   - Try: supabase login (re-authenticate)');
    console.log('   - Use: supabase db push --db-url "direct_url"');
  }
}

main();
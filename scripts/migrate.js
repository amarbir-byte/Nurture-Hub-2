#!/usr/bin/env node

/**
 * Supabase Migration Management Script
 * 
 * This script helps manage database migrations for the Nurture Hub project.
 * It provides a simple interface to apply migrations and check status.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_PROJECT_REF = 'danbkfdqwprutyzlvnid';

function runCommand(command, description) {
  console.log(`\n🔄 ${description}...`);
  try {
    const output = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'pipe',
      cwd: process.cwd()
    });
    console.log(`✅ ${description} completed successfully`);
    if (output.trim()) {
      console.log(output);
    }
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`);
    console.error(error.message);
    return false;
  }
}

function checkSupabaseCLI() {
  try {
    execSync('supabase --version', { stdio: 'pipe' });
    return true;
  } catch (error) {
    console.error('❌ Supabase CLI not found. Please install it first:');
    console.error('   brew install supabase/tap/supabase');
    return false;
  }
}

function checkProjectLink() {
  try {
    execSync('supabase projects list', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

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

function main() {
  console.log('🚀 Supabase Migration Manager');
  console.log('============================\n');

  // Check if Supabase CLI is installed
  if (!checkSupabaseCLI()) {
    process.exit(1);
  }

  // Check if project is linked
  if (!checkProjectLink()) {
    console.log('⚠️  Project not linked. Please run:');
    console.log('   1. supabase login');
    console.log('   2. supabase link --project-ref danbkfdqwprutyzlvnid');
    console.log('\nThen run this script again.');
    process.exit(1);
  }

  // List available migrations
  const migrations = listMigrations();
  console.log(`📁 Found ${migrations.length} migration files:`);
  migrations.forEach((file, index) => {
    console.log(`   ${index + 1}. ${file}`);
  });

  // Get command from arguments
  const command = process.argv[2];

  switch (command) {
    case 'push':
      console.log('\n📤 Pushing migrations to remote database...');
      if (runCommand('supabase db push', 'Push migrations')) {
        console.log('\n🎉 All migrations applied successfully!');
      }
      break;

    case 'status':
      console.log('\n📊 Checking migration status...');
      runCommand('supabase migration list', 'List migration status');
      break;

    case 'pull':
      console.log('\n📥 Pulling remote schema changes...');
      runCommand('supabase db pull', 'Pull remote changes');
      break;

    case 'reset':
      console.log('\n🔄 Resetting local database...');
      if (runCommand('supabase db reset', 'Reset local database')) {
        console.log('\n🎉 Local database reset successfully!');
      }
      break;

    case 'new':
      const description = process.argv[3];
      if (!description) {
        console.log('❌ Please provide a migration description:');
        console.log('   node scripts/migrate.js new "add_new_table"');
        process.exit(1);
      }
      console.log(`\n📝 Creating new migration: ${description}`);
      runCommand(`supabase migration new "${description}"`, 'Create new migration');
      break;

    default:
      console.log('\n📖 Available commands:');
      console.log('   push    - Apply all pending migrations to remote database');
      console.log('   status  - Check migration status');
      console.log('   pull    - Pull remote schema changes');
      console.log('   reset   - Reset local database');
      console.log('   new     - Create a new migration file');
      console.log('\n📝 Examples:');
      console.log('   node scripts/migrate.js push');
      console.log('   node scripts/migrate.js status');
      console.log('   node scripts/migrate.js new "add_user_preferences"');
      break;
  }
}

main();

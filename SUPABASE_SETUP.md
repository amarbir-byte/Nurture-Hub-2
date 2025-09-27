# Supabase CLI Setup Guide

This guide will help you set up Supabase CLI for local development and database management.

## Prerequisites

- Node.js 18+ installed
- Docker Desktop installed and running
- Supabase account (for production)

## Installation

1. **Install Supabase CLI globally:**
   ```bash
   npm install -g supabase
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

## Initial Setup

1. **Login to Supabase:**
   ```bash
   supabase login
   ```

2. **Link to your Supabase project:**
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. **Start local Supabase services:**
   ```bash
   npm run db:start
   ```

   This will start:
   - PostgreSQL database (port 54322)
   - Supabase API (port 54321)
   - Supabase Studio (port 54323)
   - Inbucket email testing (port 54324)

## Available Scripts

### Database Management
- `npm run db:start` - Start local Supabase services
- `npm run db:stop` - Stop local Supabase services
- `npm run db:reset` - Reset local database and run migrations
- `npm run db:migrate` - Push migrations to remote database
- `npm run db:seed` - Seed local database with sample data
- `npm run db:studio` - Open Supabase Studio in browser
- `npm run db:generate-types` - Generate TypeScript types from database schema

### Development Workflow

1. **Start local development:**
   ```bash
   npm run db:start
   npm run dev
   ```

2. **Create a new migration:**
   ```bash
   supabase migration new add_new_feature
   ```

3. **Apply migrations:**
   ```bash
   npm run db:reset  # For local development
   npm run db:migrate  # For production
   ```

4. **Generate TypeScript types:**
   ```bash
   npm run db:generate-types
   ```

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# For local development
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your_local_anon_key

# For production
# VITE_SUPABASE_URL=your_supabase_project_url
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Schema

The database includes the following main tables:

- `users` - User accounts and authentication
- `properties` - Property listings with geocoding
- `contacts` - Contact management with type and temperature
- `templates` - SMS/email templates
- `communication_history` - Track communications
- `subscriptions` - User subscription management

## Local Development Features

### Supabase Studio
Access the local Supabase Studio at http://localhost:54323 to:
- View and edit database tables
- Test authentication
- Monitor API requests
- Manage storage

### Email Testing
Access Inbucket at http://localhost:54324 to:
- View emails sent by the application
- Test email templates
- Debug email functionality

### Database Seeding
The `supabase/seed.sql` file contains sample data for local development:
- Demo user account (demo@nurturehub.com / password123)
- Sample properties in Auckland
- Sample contacts with different types and temperatures
- Sample templates

## Production Deployment

1. **Push migrations to production:**
   ```bash
   npm run db:migrate
   ```

2. **Update environment variables:**
   ```bash
   # Update .env.local with production values
   VITE_SUPABASE_URL=your_production_url
   VITE_SUPABASE_ANON_KEY=your_production_anon_key
   ```

3. **Deploy your application:**
   ```bash
   npm run build
   npm run pre-deploy
   ```

## Troubleshooting

### Common Issues

1. **Docker not running:**
   - Ensure Docker Desktop is installed and running
   - Restart Docker if services fail to start

2. **Port conflicts:**
   - Check if ports 54321-54324 are available
   - Stop other services using these ports

3. **Migration errors:**
   - Check migration files for syntax errors
   - Ensure database is in a clean state

4. **Type generation issues:**
   - Ensure local database is running
   - Check database connection

### Useful Commands

```bash
# Check Supabase status
supabase status

# View logs
supabase logs

# Reset everything
supabase stop
supabase start

# Generate types from remote database
supabase gen types typescript --remote > src/types/supabase.ts
```

## Best Practices

1. **Always test migrations locally first**
2. **Use descriptive migration names**
3. **Backup production data before major changes**
4. **Keep seed data minimal and realistic**
5. **Use environment variables for sensitive data**
6. **Regularly update generated types**

## Resources

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Supabase Local Development](https://supabase.com/docs/guides/cli/local-development)
- [Database Migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [TypeScript Integration](https://supabase.com/docs/guides/api/generating-types)

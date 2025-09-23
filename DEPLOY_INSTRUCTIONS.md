# 🚀 Deployment Instructions for Nurture Hub

## Step 1: Create GitHub Repository

1. **Go to GitHub.com** and sign in to your account
2. **Click "New repository"** (green button)
3. **Repository settings:**
   - Repository name: `nurture-hub`
   - Description: `Proximity-based marketing CRM for real estate agents`
   - Make it **Private** (since it's a commercial project)
   - Don't initialize with README (we already have one)

4. **Copy the repository URL** (it will look like: `https://github.com/YOUR_USERNAME/nurture-hub.git`)

## Step 2: Connect Local Git to GitHub

Run these commands in your terminal (replace YOUR_USERNAME with your GitHub username):

```bash
cd "C:\Users\iamar\Nurture Hub"

# Add the GitHub remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/nurture-hub.git

# Push to GitHub
git push -u origin main
```

## Step 3: Deploy to Vercel

### Option A: Automatic Deployment (Recommended)

1. **Go to vercel.com** and sign in with GitHub
2. **Click "New Project"**
3. **Select your `nurture-hub` repository**
4. **Configure deployment:**
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

5. **Add Environment Variables** (in Vercel dashboard):
   ```
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   VITE_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
   VITE_APP_URL=https://your-app-name.vercel.app
   ```

6. **Click Deploy** - Vercel will build and deploy automatically!

### Option B: Manual Deployment via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod

# Follow the prompts to configure your deployment
```

## Step 4: Configure Production Environment

### Supabase Setup
1. **Database Migrations:**
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Run the migration files in order:
     - `001_initial_schema.sql`
     - `002_add_property_columns.sql`
     - `003_add_missing_columns.sql`

2. **Authentication Settings:**
   - Go to Authentication > Settings
   - Add your Vercel domain to "Site URL"
   - Add redirect URLs for auth callbacks

### Stripe Setup
1. **Products and Prices:**
   - Create 3 products: Starter ($29), Professional ($79), Enterprise ($199)
   - Set up recurring monthly pricing
   - Copy price IDs for your environment variables

2. **Webhooks:**
   - Add webhook endpoint: `https://your-app.vercel.app/api/webhooks/stripe`
   - Select events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`

## Step 5: Test Deployment

### Production URL
Your app will be available at: `https://your-app-name.vercel.app`

### Beta Testing Checklist
- [ ] Test user registration and login
- [ ] Verify database connectivity
- [ ] Test Stripe subscription flow (use test mode)
- [ ] Check mobile responsiveness
- [ ] Verify PWA installation
- [ ] Test offline functionality
- [ ] Confirm beta feedback widget appears

## Step 6: Beta Tester Setup

### Create Beta Accounts
```bash
# Run the beta setup script for each tester
node scripts/setup-beta-data.js
```

### Beta Tester Email Template
```
Subject: 🎉 Welcome to Nurture Hub Beta Testing!

Hi [Name],

You've been selected for exclusive beta access to Nurture Hub - the new proximity-based marketing CRM for real estate agents.

🔗 **Beta Access URL:** https://your-app.vercel.app
📧 **Your Login:** [email]
🔑 **Temporary Password:** [password]

🎁 **Beta Benefits:**
- 30-day extended trial (vs 14-day standard)
- Direct founder support via WhatsApp
- 50% discount on first year subscription
- Early access to all new features

📋 **What to Test:**
1. Import your contacts and properties
2. Create proximity marketing campaigns
3. Test SMS templates and messaging
4. Explore subscription and billing features
5. Use the feedback widget for any suggestions

📞 **Need Help?**
WhatsApp: +64 xxx xxx xxx
Email: beta@nurturehub.app

We're excited to hear your feedback!

Best regards,
The Nurture Hub Team
```

## Step 7: Monitoring & Support

### Performance Monitoring
- Check Vercel dashboard for deployment status
- Monitor app performance via built-in monitoring
- Review error logs and fix issues promptly

### Beta Support Process
1. **Daily Check-ins:** Email beta testers for feedback
2. **Immediate Support:** Respond to issues within 2 hours
3. **Weekly Reviews:** Analyze usage data and feedback
4. **Hot Fixes:** Deploy critical fixes within 24 hours

## Step 8: Go-Live Checklist

- [ ] All beta feedback implemented
- [ ] Performance optimization complete
- [ ] Security audit passed
- [ ] Payment processing tested
- [ ] Customer support process established
- [ ] Marketing materials prepared
- [ ] Launch announcement ready

## 🎯 Success Metrics to Track

- **Beta Engagement:** 80%+ daily active users
- **Feature Completion:** 90%+ complete all scenarios
- **Performance:** <2 second load times
- **Conversion Intent:** 60%+ would purchase after trial
- **NPS Score:** 8+ average rating

---

**Ready to launch!** 🚀

Once deployed, your beta testers will have access to a fully functional, production-ready CRM at a professional URL they can test from any device.
import { createClient } from '@supabase/supabase-js'

// This script sets up test data for beta users
// Run with: node scripts/setup-beta-data.js

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Service role key needed for admin operations

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Sample data for beta testing
const betaTestData = {
  properties: [
    {
      address: '123 Queen Street, Auckland Central',
      price: 850000,
      bedrooms: 3,
      bathrooms: 2,
      property_type: 'apartment',
      status: 'listed',
      description: 'Modern apartment in the heart of Auckland with city views',
      listing_date: '2024-01-15',
      lat: -36.8485,
      lng: 174.7633
    },
    {
      address: '456 Ponsonby Road, Ponsonby',
      price: 1200000,
      bedrooms: 4,
      bathrooms: 3,
      property_type: 'house',
      status: 'sold',
      description: 'Character villa in trendy Ponsonby with garden',
      listing_date: '2024-01-10',
      sold_date: '2024-01-25',
      lat: -36.8528,
      lng: 174.7378
    },
    {
      address: '789 Takapuna Beach Road, Takapuna',
      price: 950000,
      bedrooms: 2,
      bathrooms: 2,
      property_type: 'townhouse',
      status: 'listed',
      description: 'Beachfront townhouse with stunning harbour views',
      listing_date: '2024-01-20',
      lat: -36.7851,
      lng: 174.7762
    }
  ],

  contacts: [
    {
      name: 'John Smith',
      email: 'john.smith@email.com',
      phone: '+64 21 123 4567',
      address: '111 Queen Street, Auckland Central',
      notes: 'Looking for investment property, budget $800k-1M',
      last_contact_date: '2024-01-20',
      lat: -36.8485,
      lng: 174.7633
    },
    {
      name: 'Sarah Johnson',
      email: 'sarah.j@email.com',
      phone: '+64 21 234 5678',
      address: '222 Ponsonby Road, Ponsonby',
      notes: 'First home buyer, pre-approved for $750k',
      last_contact_date: '2024-01-18',
      lat: -36.8528,
      lng: 174.7378
    },
    {
      name: 'Mike Chen',
      email: 'mike.chen@email.com',
      phone: '+64 21 345 6789',
      address: '333 Beach Road, Takapuna',
      notes: 'Looking to downsize, selling current property',
      last_contact_date: '2024-01-22',
      lat: -36.7851,
      lng: 174.7762
    },
    {
      name: 'Emma Wilson',
      email: 'emma.wilson@email.com',
      phone: '+64 21 456 7890',
      address: '444 Richmond Road, Grey Lynn',
      notes: 'Young family, needs 3+ bedrooms',
      last_contact_date: '2024-01-19',
      lat: -36.8641,
      lng: 174.7423
    },
    {
      name: 'David Brown',
      email: 'david.brown@email.com',
      phone: '+64 21 567 8901',
      address: '555 Dominion Road, Mount Eden',
      notes: 'Investor looking for rental properties',
      last_contact_date: '2024-01-21',
      lat: -36.8785,
      lng: 174.7544
    }
  ],

  templates: [
    {
      name: 'New Listing Alert',
      category: 'listing',
      content: 'Hi {contact_name}! 🏠 New listing at {property_address} for ${property_price}. {bedrooms} bed, {bathrooms} bath {property_type}. Perfect for your needs! Call me to view: {agent_name} {agent_phone}',
      placeholders: ['contact_name', 'property_address', 'property_price', 'bedrooms', 'bathrooms', 'property_type', 'agent_name', 'agent_phone']
    },
    {
      name: 'Price Drop Alert',
      category: 'pricing',
      content: 'Great news {contact_name}! 📉 Price reduced on {property_address} - now ${property_price}. This won\'t last long in this market. Want to schedule a viewing? - {agent_name}',
      placeholders: ['contact_name', 'property_address', 'property_price', 'agent_name']
    },
    {
      name: 'Open Home Invitation',
      category: 'event',
      content: 'Open home this weekend! 🏡 {property_address} - Saturday 2-3pm. Beautiful {property_type} with {bedrooms} bedrooms. See you there! {agent_name}',
      placeholders: ['property_address', 'property_type', 'bedrooms', 'agent_name']
    },
    {
      name: 'Market Update',
      category: 'market',
      content: 'Hi {contact_name}, market update for your area: Properties similar to what you\'re looking for are selling quickly. Let\'s chat about your timeline. Best, {agent_name}',
      placeholders: ['contact_name', 'agent_name']
    }
  ]
}

async function setupBetaUser(userEmail, userData = {}) {
  console.log(`\n🔧 Setting up beta user: ${userEmail}`)

  try {
    // 1. Get or create user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', userEmail)
      .single()

    if (userError && userError.code !== 'PGRST116') {
      throw userError
    }

    if (!user) {
      console.log('❌ User not found. Please ensure user has signed up first.')
      return
    }

    console.log(`✅ Found user: ${user.id}`)

    // 2. Extend trial period to 30 days
    const trialEndDate = new Date()
    trialEndDate.setDate(trialEndDate.getDate() + 30)

    const { error: updateError } = await supabase
      .from('users')
      .update({
        trial_end_date: trialEndDate.toISOString(),
        unlimited_access: false, // Beta users get extended trial, not unlimited
        plan_type: 'trial'
      })
      .eq('id', user.id)

    if (updateError) throw updateError
    console.log('✅ Extended trial to 30 days')

    // 3. Add sample properties
    const propertiesWithUserId = betaTestData.properties.map(prop => ({
      ...prop,
      user_id: user.id
    }))

    const { data: insertedProperties, error: propError } = await supabase
      .from('properties')
      .insert(propertiesWithUserId)
      .select()

    if (propError) throw propError
    console.log(`✅ Added ${insertedProperties.length} sample properties`)

    // 4. Add sample contacts
    const contactsWithUserId = betaTestData.contacts.map(contact => ({
      ...contact,
      user_id: user.id
    }))

    const { data: insertedContacts, error: contactError } = await supabase
      .from('contacts')
      .insert(contactsWithUserId)
      .select()

    if (contactError) throw contactError
    console.log(`✅ Added ${insertedContacts.length} sample contacts`)

    // 5. Add sample templates
    const templatesWithUserId = betaTestData.templates.map(template => ({
      ...template,
      user_id: user.id
    }))

    const { data: insertedTemplates, error: templateError } = await supabase
      .from('templates')
      .insert(templatesWithUserId)
      .select()

    if (templateError) throw templateError
    console.log(`✅ Added ${insertedTemplates.length} sample templates`)

    // 6. Create welcome campaign
    const welcomeCampaign = {
      user_id: user.id,
      property_id: insertedProperties[0].id,
      message: `Welcome to Nurture Hub beta testing! This is a sample campaign for ${insertedProperties[0].address}. You found ${insertedContacts.length} contacts within 1km radius.`,
      recipients_count: insertedContacts.length,
      radius: 1000,
      campaign_type: 'proximity',
      sent_at: new Date().toISOString()
    }

    const { error: campaignError } = await supabase
      .from('campaigns')
      .insert(welcomeCampaign)

    if (campaignError) throw campaignError
    console.log('✅ Created welcome campaign')

    // 7. Initialize usage stats
    const { error: usageError } = await supabase
      .from('usage_tracking')
      .insert({
        user_id: user.id,
        feature: 'contacts',
        count: insertedContacts.length,
        period_start: new Date().toISOString(),
        period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })

    if (usageError) throw usageError
    console.log('✅ Initialized usage tracking')

    console.log(`\n🎉 Beta setup complete for ${userEmail}!`)
    console.log(`📊 Summary:`)
    console.log(`   - Trial extended to: ${trialEndDate.toDateString()}`)
    console.log(`   - Properties: ${insertedProperties.length}`)
    console.log(`   - Contacts: ${insertedContacts.length}`)
    console.log(`   - Templates: ${insertedTemplates.length}`)
    console.log(`   - Welcome campaign created`)

  } catch (error) {
    console.error(`❌ Error setting up beta user ${userEmail}:`, error)
  }
}

// Beta tester emails - update these with actual beta user emails
const betaUsers = [
  'beta1@example.com',
  'beta2@example.com',
  'beta3@example.com',
  'beta4@example.com',
  'beta5@example.com'
]

async function setupAllBetaUsers() {
  console.log('🚀 Starting beta user setup...')

  for (const userEmail of betaUsers) {
    await setupBetaUser(userEmail)
  }

  console.log('\n✅ All beta users set up successfully!')
  console.log('\n📝 Next steps:')
  console.log('1. Send beta users their login credentials')
  console.log('2. Share the UAT guide and test scenarios')
  console.log('3. Set up daily check-ins and feedback collection')
  console.log('4. Monitor usage and performance during testing')
}

// Run the setup
setupAllBetaUsers().catch(console.error)
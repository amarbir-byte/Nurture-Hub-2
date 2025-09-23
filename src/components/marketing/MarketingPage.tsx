import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { CampaignWizard } from './CampaignWizard'
import { CampaignCard } from './CampaignCard'

interface Property {
  id: string
  address: string
  status: string
  price: number
  property_type: string
  lat: number
  lng: number
}

interface Contact {
  id: string
  name: string
  address: string
  phone?: string
  lat: number
  lng: number
}

interface Campaign {
  id: string
  user_id: string
  property_id: string
  message: string
  recipients_count: number
  radius: number
  sent_at: string
  campaign_type: string
  property?: Property
}

export function MarketingPage() {
  const { user } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    try {
      // Fetch campaigns with property details
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select(`
          *,
          property:properties(*)
        `)
        .eq('user_id', user?.id)
        .order('sent_at', { ascending: false })

      if (campaignsError) throw campaignsError

      // Fetch properties for campaign creation
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .eq('user_id', user?.id)
        .not('lat', 'is', null)
        .not('lng', 'is', null)
        .order('created_at', { ascending: false })

      if (propertiesError) throw propertiesError

      setCampaigns(campaignsData || [])
      setProperties(propertiesData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCampaignCreated = () => {
    fetchData()
    setShowWizard(false)
  }

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return

    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId)
        .eq('user_id', user?.id)

      if (error) throw error
      setCampaigns(prev => prev.filter(c => c.id !== campaignId))
    } catch (error) {
      console.error('Error deleting campaign:', error)
      alert('Error deleting campaign. Please try again.')
    }
  }

  const stats = {
    totalCampaigns: campaigns.length,
    totalRecipients: campaigns.reduce((sum, c) => sum + c.recipients_count, 0),
    avgRadius: campaigns.length > 0 ? (campaigns.reduce((sum, c) => sum + c.radius, 0) / campaigns.length).toFixed(1) : '0',
    recentCampaigns: campaigns.filter(c => {
      const sentDate = new Date(c.sent_at)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      return sentDate >= sevenDaysAgo
    }).length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600">Loading marketing data...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketing Campaigns</h1>
          <p className="text-gray-600">Create proximity-based SMS campaigns for your listings</p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="mt-4 sm:mt-0 btn-primary"
          disabled={properties.length === 0}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Campaign
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.totalCampaigns}</div>
          <div className="text-sm text-gray-600">Total Campaigns</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-primary-600">{stats.totalRecipients}</div>
          <div className="text-sm text-gray-600">SMS Sent</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">{stats.avgRadius}km</div>
          <div className="text-sm text-gray-600">Avg Radius</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.recentCampaigns}</div>
          <div className="text-sm text-gray-600">This Week</div>
        </div>
      </div>

      {/* No Properties Warning */}
      {properties.length === 0 && (
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                No Properties with Location Data
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                You need to add properties with addresses before creating marketing campaigns.
                The system uses property locations to find nearby contacts.
              </p>
              <div className="mt-3">
                <a
                  href="#"
                  onClick={() => window.location.hash = 'properties'}
                  className="text-sm font-medium text-yellow-800 underline hover:text-yellow-600"
                >
                  Add properties now →
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Campaign List */}
      {campaigns.length === 0 ? (
        <div className="card text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No campaigns yet</h3>
          <p className="mt-2 text-gray-600">
            {properties.length === 0
              ? 'Add some properties first, then create your first proximity marketing campaign.'
              : 'Create your first proximity marketing campaign to reach nearby homeowners.'
            }
          </p>
          {properties.length > 0 && (
            <button
              onClick={() => setShowWizard(true)}
              className="mt-4 btn-primary"
            >
              Create First Campaign
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Recent Campaigns</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onDelete={() => handleDeleteCampaign(campaign.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Campaign Wizard Modal */}
      {showWizard && (
        <CampaignWizard
          properties={properties}
          onComplete={handleCampaignCreated}
          onCancel={() => setShowWizard(false)}
        />
      )}
    </div>
  )
}
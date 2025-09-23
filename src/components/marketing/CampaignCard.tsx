interface Property {
  id: string
  address: string
  status: string
  price: number
  property_type: string
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

interface CampaignCardProps {
  campaign: Campaign
  onDelete: () => void
}

export function CampaignCard({ campaign, onDelete }: CampaignCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'listed':
        return 'bg-green-100 text-green-800'
      case 'sold':
        return 'bg-blue-100 text-blue-800'
      case 'withdrawn':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getCampaignTypeIcon = () => {
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    )
  }

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(campaign.message)
      // In a real app, you'd show a toast notification
      alert('Message copied to clipboard!')
    } catch (error) {
      console.error('Error copying message:', error)
    }
  }

  return (
    <div className="card hover:shadow-lg transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="text-primary-600">
            {getCampaignTypeIcon()}
          </div>
          <span className="text-sm font-medium text-gray-900 uppercase tracking-wide">
            {campaign.campaign_type} Campaign
          </span>
        </div>
        <div className="text-xs text-gray-500">
          {formatDate(campaign.sent_at)}
        </div>
      </div>

      {/* Property Info */}
      {campaign.property && (
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className={`badge ${getStatusColor(campaign.property.status)}`}>
              {campaign.property.status.charAt(0).toUpperCase() + campaign.property.status.slice(1)}
            </span>
            <span className="text-sm text-gray-600 capitalize">
              {campaign.property.property_type}
            </span>
          </div>
          <h3 className="font-medium text-gray-900 mb-1">
            {campaign.property.address}
          </h3>
          <p className="text-lg font-semibold text-primary-600">
            {formatPrice(campaign.property.price)}
          </p>
        </div>
      )}

      {/* Campaign Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <span className="text-gray-600">Recipients:</span>
          <span className="ml-2 font-medium text-primary-600">
            {campaign.recipients_count}
          </span>
        </div>
        <div>
          <span className="text-gray-600">Radius:</span>
          <span className="ml-2 font-medium">
            {campaign.radius.toFixed(1)}km
          </span>
        </div>
      </div>

      {/* Message Preview */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Message:</h4>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">
            {campaign.message}
          </p>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className={`font-medium ${
            campaign.message.length <= 160 ? 'text-green-600' :
            campaign.message.length <= 320 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {campaign.message.length} characters • {Math.ceil(campaign.message.length / 160)} SMS
          </span>
          <button
            onClick={copyMessage}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Copy
          </button>
        </div>
      </div>

      {/* Campaign Performance (placeholder for future) */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-1">Campaign Status</h4>
        <p className="text-xs text-blue-700">
          ✅ Campaign created successfully. SMS delivery tracking will be available when integrated with SMS provider.
        </p>
      </div>

      {/* Actions */}
      <div className="flex space-x-2 pt-4 border-t border-gray-200">
        <button
          onClick={copyMessage}
          className="flex-1 btn-secondary text-sm"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy Message
        </button>
        <button
          onClick={onDelete}
          className="flex-1 btn-ghost text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </button>
      </div>
    </div>
  )
}
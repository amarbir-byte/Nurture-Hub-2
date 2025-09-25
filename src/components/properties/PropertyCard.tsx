interface Property {
  id: string
  user_id: string
  address: string
  status: 'listed' | 'sold' | 'withdrawn'
  price: number
  bedrooms?: number
  bathrooms?: number
  property_type: 'house' | 'apartment' | 'townhouse' | 'land' | 'commercial'
  description?: string
  listing_date?: string
  sold_date?: string
  sale_price?: number
  list_price?: number
  floor_area?: number
  land_area_m2?: number
  organisation?: string
  sale_method?: string
  lat?: number
  lng?: number
  created_at: string
  updated_at: string
}

interface PropertyCardProps {
  property: Property
  onEdit: () => void
  onDelete: () => void
  onViewDetails?: () => void
}

export function PropertyCard({ property, onEdit, onDelete, onViewDetails }: PropertyCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('en-NZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
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

  const getPropertyTypeIcon = (type: string) => {
    switch (type) {
      case 'house':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m3 12 2-2m0 0 7-7 7 7M5 10v10a1 1 0 0 0 1 1h3m0 0h6m0 0h3a1 1 0 0 0 1-1V10M9 21v-6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6" />
          </svg>
        )
      case 'apartment':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        )
      case 'townhouse':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
          </svg>
        )
      case 'land':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        )
      case 'commercial':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        )
      default:
        return null
    }
  }

  const handleCardClick = () => {
    if (onViewDetails) {
      onViewDetails()
    }
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit()
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete()
  }

  return (
    <div 
      className="card-interactive group animate-enter cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-800 dark:to-primary-700 rounded-lg flex items-center justify-center text-primary-600 dark:text-primary-300 group-hover:scale-110 transition-transform duration-200">
            {getPropertyTypeIcon(property.property_type)}
          </div>
          <span className="text-xs font-semibold text-primary-700 dark:text-primary-300 capitalize">
            {property.property_type.replace('_', ' ')}
          </span>
        </div>
        <span className={`badge text-xs ${getStatusColor(property.status)}`}>
          {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
        </span>
      </div>

      {/* Compact Address */}
      <h3 className="text-lg font-bold text-primary-900 dark:text-white mb-2 leading-tight group-hover:text-accent-700 dark:group-hover:text-accent-300 transition-colors duration-200 line-clamp-2">
        {property.address}
      </h3>

      {/* Compact Price */}
      <div className="mb-3">
        {property.status === 'sold' && property.sale_price ? (
          <div>
            <div className="text-xl font-bold bg-gradient-to-r from-success-600 to-success-700 bg-clip-text text-transparent">
              {formatPrice(property.sale_price)}
            </div>
            {property.price && property.price !== property.sale_price && (
              <div className="text-xs text-primary-400 dark:text-primary-300">
                Listed: {formatPrice(property.price)}
              </div>
            )}
          </div>
        ) : (
          <div className="text-xl font-bold bg-gradient-to-r from-accent-600 to-accent-700 bg-clip-text text-transparent">
            {formatPrice(property.sale_price || property.price)}
          </div>
        )}
      </div>

      {/* Compact Property Details */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center flex-wrap gap-2">
          {property.bedrooms && (
            <div className="flex items-center space-x-1 bg-primary-50 dark:bg-primary-900/20 px-2 py-1 rounded-lg">
              <div className="w-3 h-3 text-primary-600 dark:text-primary-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-primary-700 dark:text-primary-300">
                {property.bedrooms}bd
              </span>
            </div>
          )}
          {property.bathrooms && (
            <div className="flex items-center space-x-1 bg-accent-50 dark:bg-accent-900/20 px-2 py-1 rounded-lg">
              <div className="w-3 h-3 text-accent-600 dark:text-accent-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-accent-700 dark:text-accent-300">
                {property.bathrooms}ba
              </span>
            </div>
          )}
          {property.floor_area && (
            <div className="flex items-center space-x-1 bg-success-50 dark:bg-success-900/20 px-2 py-1 rounded-lg">
              <span className="text-xs font-medium text-success-700 dark:text-success-300">
                {property.floor_area}m²
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Compact Agency & Dates */}
      <div className="text-xs text-gray-500 dark:text-primary-400 mb-3 space-y-1">
        {property.organisation && (
          <div className="flex items-center">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="truncate">{property.organisation}</span>
          </div>
        )}
        <div className="flex justify-between">
          {property.listing_date && (
            <span>Listed: {formatDate(property.listing_date)}</span>
          )}
          {property.sold_date && (
            <span>Sold: {formatDate(property.sold_date)}</span>
          )}
        </div>
      </div>

      {/* Compact Description */}
      {property.description && (
        <p className="text-xs text-gray-600 dark:text-primary-300 mb-3 line-clamp-2">
          {property.description}
        </p>
      )}

      {/* Compact Actions */}
      <div className="pt-3 border-t border-primary-100 dark:border-primary-800">
        <div className="flex justify-center space-x-2">
          <button
            onClick={handleEditClick}
            className="btn-secondary btn-sm text-xs px-3 py-1"
          >
            Edit
          </button>
          <button
            onClick={handleDeleteClick}
            className="btn-ghost btn-sm text-xs px-3 py-1 text-error-600 dark:text-error-400 hover:text-error-700 dark:hover:text-error-300 hover:bg-error-50 dark:hover:bg-error-900/20"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
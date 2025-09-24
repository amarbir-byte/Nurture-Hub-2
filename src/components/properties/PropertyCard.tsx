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

  return (
    <div className="card-hover group animate-enter">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-800 dark:to-primary-700 rounded-xl flex items-center justify-center text-primary-600 dark:text-primary-300 group-hover:scale-110 transition-transform duration-200">
            {getPropertyTypeIcon(property.property_type)}
          </div>
          <div>
            <span className="text-sm font-semibold text-primary-700 dark:text-primary-300 capitalize">
              {property.property_type.replace('_', ' ')}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end space-y-2">
          <span className={`badge ${getStatusColor(property.status)}`}>
            {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Address */}
      <h3 className="text-xl font-bold text-primary-900 dark:text-white mb-4 leading-tight group-hover:text-accent-700 dark:group-hover:text-accent-300 transition-colors duration-200">
        {property.address}
      </h3>

      {/* Price */}
      <div className="mb-6">
        {property.status === 'sold' && property.sale_price ? (
          <div>
            <div className="text-3xl font-bold bg-gradient-to-r from-success-600 to-success-700 bg-clip-text text-transparent">
              {formatPrice(property.sale_price)}
            </div>
            <div className="text-sm text-primary-500 dark:text-primary-400 mt-1">
              Sold for {formatPrice(property.sale_price)}
              {property.price && property.price !== property.sale_price && (
                <span className="ml-1 text-primary-400 dark:text-primary-500">
                  (Listed: {formatPrice(property.price)})
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="text-3xl font-bold bg-gradient-to-r from-accent-600 to-accent-700 bg-clip-text text-transparent">
            {formatPrice(property.price)}
          </div>
        )}
      </div>

      {/* Property Details */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center flex-wrap gap-4">
          {property.bedrooms && (
            <div className="flex items-center space-x-2 bg-primary-50 dark:bg-primary-900/20 px-3 py-2 rounded-xl">
              <div className="w-5 h-5 text-primary-600 dark:text-primary-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-primary-700 dark:text-primary-300">
                {property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          {property.bathrooms && (
            <div className="flex items-center space-x-2 bg-accent-50 dark:bg-accent-900/20 px-3 py-2 rounded-xl">
              <div className="w-5 h-5 text-accent-600 dark:text-accent-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-accent-700 dark:text-accent-300">
                {property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Area Information */}
        {(property.floor_area || property.land_area_m2) && (
          <div className="flex items-center flex-wrap gap-4">
            {property.floor_area && (
              <div className="flex items-center space-x-2 bg-success-50 dark:bg-success-900/20 px-3 py-2 rounded-xl">
                <div className="w-5 h-5 text-success-600 dark:text-success-400">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-success-700 dark:text-success-300">
                  {property.floor_area}m² floor
                </span>
              </div>
            )}
            {property.land_area_m2 && (
              <div className="flex items-center space-x-2 bg-warning-50 dark:bg-warning-900/20 px-3 py-2 rounded-xl">
                <div className="w-5 h-5 text-warning-600 dark:text-warning-400">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-warning-700 dark:text-warning-300">
                  {property.land_area_m2}m² land
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Agency Information */}
      {property.organisation && (
        <div className="text-sm text-gray-600 mb-3">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            {property.organisation}
          </div>
        </div>
      )}

      {/* Description */}
      {property.description && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {property.description}
        </p>
      )}

      {/* Dates */}
      <div className="text-xs text-gray-500 mb-4">
        {property.listing_date && (
          <div>Listed: {formatDate(property.listing_date)}</div>
        )}
        {property.sold_date && (
          <div>Sold: {formatDate(property.sold_date)}</div>
        )}
        <div>Added: {formatDate(property.created_at)}</div>
      </div>

      {/* Actions */}
      <div className="space-y-3 pt-6 border-t border-primary-100 dark:border-primary-800">
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="w-full btn-primary group flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>View Details & Contact Nearby</span>
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        )}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onEdit}
            className="btn-secondary group flex items-center justify-center space-x-2"
          >
            <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Edit</span>
          </button>
          <button
            onClick={onDelete}
            className="btn-ghost group flex items-center justify-center space-x-2 text-error-600 dark:text-error-400 hover:text-error-700 dark:hover:text-error-300 hover:bg-error-50 dark:hover:bg-error-900/20"
          >
            <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  )
}
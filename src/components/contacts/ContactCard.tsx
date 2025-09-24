interface Contact {
  id: string
  user_id: string
  name: string
  email?: string
  phone?: string
  address: string
  suburb?: string
  city?: string
  postal_code?: string
  lat?: number
  lng?: number
  notes?: string
  last_contact_date?: string
  follow_up_date?: string
  contact_source: 'manual' | 'import' | 'campaign' | 'referral'
  tags?: string[]
  created_at: string
  updated_at: string
}

interface ContactCardProps {
  contact: Contact
  onEdit: () => void
  onDelete: () => void
  onViewDetails?: () => void
}

export function ContactCard({ contact, onEdit, onDelete, onViewDetails }: ContactCardProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('en-NZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'manual':
        return 'bg-blue-100 text-blue-800'
      case 'import':
        return 'bg-green-100 text-green-800'
      case 'campaign':
        return 'bg-purple-100 text-purple-800'
      case 'referral':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getFollowUpStatus = () => {
    if (!contact.follow_up_date) return null

    const today = new Date()
    const followUpDate = new Date(contact.follow_up_date)
    const diffTime = followUpDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return { status: 'overdue', color: 'text-red-600', text: `${Math.abs(diffDays)} days overdue` }
    } else if (diffDays === 0) {
      return { status: 'due', color: 'text-orange-600', text: 'Due today' }
    } else if (diffDays <= 7) {
      return { status: 'upcoming', color: 'text-yellow-600', text: `Due in ${diffDays} days` }
    } else {
      return { status: 'future', color: 'text-gray-600', text: `Due ${formatDate(contact.follow_up_date)}` }
    }
  }

  const followUpStatus = getFollowUpStatus()

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (contact.phone) {
      // Clean phone number for tel: link
      const cleanPhone = contact.phone.replace(/[^\d+]/g, '')
      window.open(`tel:${cleanPhone}`, '_self')
    }
  }

  const handleEmail = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (contact.email) {
      window.open(`mailto:${contact.email}`, '_self')
    }
  }

  const handleSMS = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (contact.phone) {
      // Clean phone number for sms: link
      const cleanPhone = contact.phone.replace(/[^\d+]/g, '')
      window.open(`sms:${cleanPhone}`, '_self')
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
      className="card-interactive group cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-accent-500 to-accent-700 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200">
            <span className="text-sm font-bold text-white">
              {contact.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className={`badge text-xs ${getSourceColor(contact.contact_source)}`}>
            {contact.contact_source.charAt(0).toUpperCase() + contact.contact_source.slice(1)}
          </span>
        </div>
        {followUpStatus && (
          <div className={`text-xs font-medium px-2 py-1 rounded-full ${followUpStatus.color} ${
            followUpStatus.status === 'overdue' ? 'bg-error-100 dark:bg-error-900/30' :
            followUpStatus.status === 'due' ? 'bg-warning-100 dark:bg-warning-900/30' :
            'bg-primary-100 dark:bg-primary-900/30'
          }`}>
            {followUpStatus.text}
          </div>
        )}
      </div>

      {/* Compact Name */}
      <h3 className="text-lg font-bold text-primary-900 dark:text-white mb-2 leading-tight group-hover:text-accent-700 dark:group-hover:text-accent-300 transition-colors duration-200">
        {contact.name}
      </h3>

      {/* Compact Contact Info */}
      <div className="space-y-2 mb-3">
        {contact.email && (
          <div className="flex items-center text-xs text-primary-600 dark:text-primary-400">
            <div className="w-6 h-6 bg-primary-100 dark:bg-primary-900/20 rounded-lg flex items-center justify-center mr-2">
              <svg className="w-3 h-3 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="truncate font-medium">{contact.email}</span>
          </div>
        )}

        {contact.phone && (
          <div className="flex items-center text-xs text-primary-600 dark:text-primary-400">
            <div className="w-6 h-6 bg-accent-100 dark:bg-accent-900/20 rounded-lg flex items-center justify-center mr-2">
              <svg className="w-3 h-3 text-accent-600 dark:text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <span className="font-medium">{contact.phone}</span>
          </div>
        )}

        <div className="flex items-start text-xs text-primary-600 dark:text-primary-400">
          <div className="w-6 h-6 bg-success-100 dark:bg-success-900/20 rounded-lg flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
            <svg className="w-3 h-3 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium truncate">{contact.address}</div>
            {(contact.suburb || contact.city) && (
              <div className="text-primary-500 dark:text-primary-500 truncate">
                {contact.suburb}{contact.suburb && contact.city ? ', ' : ''}{contact.city}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compact Notes */}
      {contact.notes && (
        <div className="mb-3">
          <p className="text-xs text-gray-600 line-clamp-2">
            {contact.notes}
          </p>
        </div>
      )}

      {/* Compact Tags */}
      {contact.tags && contact.tags.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-1">
            {contact.tags.slice(0, 2).map((tag, index) => (
              <span key={index} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {tag}
              </span>
            ))}
            {contact.tags.length > 2 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                +{contact.tags.length - 2}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Last Contact & Quick Actions */}
      <div className="space-y-2 mb-3">
        {contact.last_contact_date && (
          <div className="text-xs text-gray-500">
            Last contact: {formatDate(contact.last_contact_date)}
          </div>
        )}

        {/* Compact Quick Actions */}
        <div className="flex space-x-1">
          {contact.phone && (
            <>
              <button
                onClick={handleCall}
                className="flex-1 btn-secondary btn-sm text-xs py-1"
                title="Call"
              >
                Call
              </button>
              <button
                onClick={handleSMS}
                className="flex-1 btn-primary btn-sm text-xs py-1"
                title="SMS"
              >
                SMS
              </button>
            </>
          )}
          {contact.email && (
            <button
              onClick={handleEmail}
              className="flex-1 btn-secondary btn-sm text-xs py-1"
              title="Email"
            >
              Email
            </button>
          )}
        </div>
      </div>

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
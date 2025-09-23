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
}

export function ContactCard({ contact, onEdit, onDelete }: ContactCardProps) {
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

  const handleCall = () => {
    if (contact.phone) {
      window.location.href = `tel:${contact.phone}`
    }
  }

  const handleEmail = () => {
    if (contact.email) {
      window.location.href = `mailto:${contact.email}`
    }
  }

  const handleSMS = () => {
    if (contact.phone) {
      window.location.href = `sms:${contact.phone}`
    }
  }

  return (
    <div className="card hover:shadow-lg transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-primary-600">
              {contact.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <span className={`badge ${getSourceColor(contact.contact_source)}`}>
              {contact.contact_source.charAt(0).toUpperCase() + contact.contact_source.slice(1)}
            </span>
          </div>
        </div>
        {followUpStatus && (
          <div className={`text-xs font-medium ${followUpStatus.color}`}>
            {followUpStatus.text}
          </div>
        )}
      </div>

      {/* Name */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {contact.name}
      </h3>

      {/* Contact Info */}
      <div className="space-y-2 mb-4">
        {contact.email && (
          <div className="flex items-center text-sm text-gray-600">
            <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="truncate">{contact.email}</span>
          </div>
        )}

        {contact.phone && (
          <div className="flex items-center text-sm text-gray-600">
            <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span>{contact.phone}</span>
          </div>
        )}

        <div className="flex items-start text-sm text-gray-600">
          <svg className="w-4 h-4 mr-2 mt-0.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div>
            <div>{contact.address}</div>
            {(contact.suburb || contact.city) && (
              <div>{contact.suburb}{contact.suburb && contact.city ? ', ' : ''}{contact.city}</div>
            )}
            {contact.postal_code && (
              <div>{contact.postal_code}</div>
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      {contact.notes && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 line-clamp-2">
            {contact.notes}
          </p>
        </div>
      )}

      {/* Tags */}
      {contact.tags && contact.tags.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {contact.tags.slice(0, 3).map((tag, index) => (
              <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {tag}
              </span>
            ))}
            {contact.tags.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                +{contact.tags.length - 3}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Last Contact */}
      {contact.last_contact_date && (
        <div className="text-xs text-gray-500 mb-4">
          Last contact: {formatDate(contact.last_contact_date)}
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex space-x-2 mb-4">
        {contact.phone && (
          <>
            <button
              onClick={handleCall}
              className="flex-1 btn-secondary text-xs py-2"
              title="Call"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Call
            </button>
            <button
              onClick={handleSMS}
              className="flex-1 btn-secondary text-xs py-2"
              title="SMS"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              SMS
            </button>
          </>
        )}
        {contact.email && (
          <button
            onClick={handleEmail}
            className="flex-1 btn-secondary text-xs py-2"
            title="Email"
          >
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Email
          </button>
        )}
      </div>

      {/* Edit/Delete Actions */}
      <div className="flex space-x-2 pt-4 border-t border-gray-200">
        <button
          onClick={onEdit}
          className="flex-1 btn-secondary text-sm"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit
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
import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

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
  land_area_ha?: number
  organisation?: string
  sale_method?: string
  days_to_sell?: number
  sale_category?: string
  new_dwelling?: boolean
  sale_tenure?: string
  lat?: number
  lng?: number
  created_at: string
  updated_at: string
}

interface Contact {
  id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  address?: string
  lat?: number
  lng?: number
}

interface PropertyDetailsModalProps {
  property: Property
  onClose: () => void
}

export function PropertyDetailsModal({ property, onClose }: PropertyDetailsModalProps) {
  const { user } = useAuth()
  const [nearbyContacts, setNearbyContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [showCommunicationModal, setShowCommunicationModal] = useState(false)
  const [communicationType, setCommunicationType] = useState<'email' | 'text' | 'call'>('email')
  const [communicationHistory, setCommunicationHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    fetchNearbyContacts()
    fetchCommunicationHistory()
  }, [property])

  const fetchNearbyContacts = async () => {
    if (!property.lat || !property.lng || !user) return

    try {
      // Get contacts within 5km radius
      const { data: contacts, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)
        .not('lat', 'is', null)
        .not('lng', 'is', null)

      if (error) throw error

      // Filter by distance (simple approximation for nearby contacts)
      const nearby = contacts?.filter(contact => {
        if (!contact.lat || !contact.lng) return false
        const distance = calculateDistance(
          property.lat!, property.lng!,
          contact.lat, contact.lng
        )
        return distance <= 5 // 5km radius
      }) || []

      setNearbyContacts(nearby)
    } catch (error) {
      console.error('Error fetching nearby contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  const fetchCommunicationHistory = async () => {
    if (!user || !property) return

    setLoadingHistory(true)
    try {
      const { data, error } = await supabase
        .from('communication_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('property_id', property.id)
        .order('sent_at', { ascending: false })

      if (error) throw error
      setCommunicationHistory(data || [])
    } catch (error) {
      console.error('Error fetching communication history:', error)
    } finally {
      setLoadingHistory(false)
    }
  }

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

  const handleContactSelection = (contactId: string) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    )
  }

  const handleCommunicate = (type: 'email' | 'text' | 'call') => {
    setCommunicationType(type)
    setShowCommunicationModal(true)
  }

  const generatePropertyMessage = () => {
    const priceStr = property.status === 'sold' && property.sale_price
      ? `Sold for ${formatPrice(property.sale_price)}`
      : `Listed at ${formatPrice(property.price)}`

    const details = []
    if (property.bedrooms) details.push(`${property.bedrooms} bedrooms`)
    if (property.bathrooms) details.push(`${property.bathrooms} bathrooms`)
    if (property.floor_area) details.push(`${property.floor_area}m² floor area`)

    return `Property Alert: ${property.address}
${priceStr}
${details.join(' • ')}
${property.property_type.charAt(0).toUpperCase() + property.property_type.slice(1)}
${property.description || ''}

Interested in similar properties in your area? Let's discuss your requirements.`
  }

  const handleSendCommunication = async () => {
    if (selectedContacts.length === 0) return

    const selectedContactsData = nearbyContacts.filter(c => selectedContacts.includes(c.id))
    const subject = `Property Update: ${property.address}`
    const message = generatePropertyMessage()

    try {
      // Record communication history for each contact
      const communicationPromises = selectedContactsData.map(contact => {
        return supabase.from('communication_history').insert({
          user_id: user?.id,
          contact_id: contact.id,
          contact_name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown',
          contact_email: contact.email,
          contact_phone: contact.phone,
          property_id: property.id,
          property_address: property.address,
          communication_type: communicationType,
          subject: communicationType === 'email' ? subject : null,
          message: message,
          context: 'property_alert',
          related_properties: [property.id],
          tags: ['property_marketing', 'nearby_contact'],
          sent_at: new Date().toISOString()
        })
      })

      await Promise.all(communicationPromises)

      // Open communication apps
      if (communicationType === 'email') {
        const emails = selectedContactsData.map(c => c.email).filter(Boolean).join(',')
        if (emails) {
          const mailtoLink = `mailto:${emails}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`
          window.open(mailtoLink, '_blank')
        }
      } else if (communicationType === 'text') {
        const phones = selectedContactsData.map(c => c.phone).filter(Boolean)
        if (phones.length > 0) {
          phones.forEach(phone => {
            const smsLink = `sms:${phone}?body=${encodeURIComponent(message)}`
            window.open(smsLink, '_blank')
          })
        }
      } else if (communicationType === 'call') {
        const phones = selectedContactsData.map(c => c.phone).filter(Boolean)
        if (phones.length > 0) {
          window.open(`tel:${phones[0]}`, '_blank')
        }
      }

      // Refresh communication history
      await fetchCommunicationHistory()

    } catch (error) {
      console.error('Error recording communication:', error)
      // Still allow the communication to proceed even if recording fails
      alert('Communication sent but there was an issue saving the record.')
    }

    setShowCommunicationModal(false)
    setSelectedContacts([])
  }

  return (
    <>
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Property Details</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-md"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Property Information */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{property.address}</h3>
                  <div className="flex items-center space-x-2 mb-4">
                    <span className={`badge ${property.status === 'sold' ? 'bg-blue-100 text-blue-800' : property.status === 'listed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                    </span>
                    <span className="text-sm text-gray-600 capitalize">
                      {property.property_type.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Price Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Price Information</h4>
                  <div className="space-y-2">
                    {property.status === 'sold' && property.sale_price ? (
                      <div className="text-2xl font-bold text-blue-600">
                        Sold: {formatPrice(property.sale_price)}
                      </div>
                    ) : (
                      <div className="text-2xl font-bold text-primary-600">
                        {formatPrice(property.price)}
                      </div>
                    )}
                    {property.list_price && property.list_price !== property.price && (
                      <div className="text-sm text-gray-600">Listed: {formatPrice(property.list_price)}</div>
                    )}
                    {property.days_to_sell && (
                      <div className="text-sm text-gray-600">Days to sell: {property.days_to_sell}</div>
                    )}
                  </div>
                </div>

                {/* Property Details */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Property Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {property.bedrooms && (
                      <div>
                        <span className="text-gray-600">Bedrooms:</span>
                        <span className="ml-2 font-medium">{property.bedrooms}</span>
                      </div>
                    )}
                    {property.bathrooms && (
                      <div>
                        <span className="text-gray-600">Bathrooms:</span>
                        <span className="ml-2 font-medium">{property.bathrooms}</span>
                      </div>
                    )}
                    {property.floor_area && (
                      <div>
                        <span className="text-gray-600">Floor Area:</span>
                        <span className="ml-2 font-medium">{property.floor_area}m²</span>
                      </div>
                    )}
                    {property.land_area_m2 && (
                      <div>
                        <span className="text-gray-600">Land Area:</span>
                        <span className="ml-2 font-medium">{property.land_area_m2}m²</span>
                      </div>
                    )}
                    {property.land_area_ha && (
                      <div>
                        <span className="text-gray-600">Land Area:</span>
                        <span className="ml-2 font-medium">{property.land_area_ha}ha</span>
                      </div>
                    )}
                    {property.sale_method && (
                      <div>
                        <span className="text-gray-600">Sale Method:</span>
                        <span className="ml-2 font-medium">{property.sale_method}</span>
                      </div>
                    )}
                    {property.sale_category && (
                      <div>
                        <span className="text-gray-600">Sale Category:</span>
                        <span className="ml-2 font-medium">{property.sale_category}</span>
                      </div>
                    )}
                    {property.new_dwelling !== undefined && (
                      <div>
                        <span className="text-gray-600">New Dwelling:</span>
                        <span className="ml-2 font-medium">{property.new_dwelling ? 'Yes' : 'No'}</span>
                      </div>
                    )}
                    {property.sale_tenure && (
                      <div>
                        <span className="text-gray-600">Tenure:</span>
                        <span className="ml-2 font-medium">{property.sale_tenure}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dates */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Important Dates</h4>
                  <div className="space-y-2 text-sm">
                    {property.listing_date && (
                      <div>
                        <span className="text-gray-600">Listed:</span>
                        <span className="ml-2 font-medium">{formatDate(property.listing_date)}</span>
                      </div>
                    )}
                    {property.sold_date && (
                      <div>
                        <span className="text-gray-600">Sold:</span>
                        <span className="ml-2 font-medium">{formatDate(property.sold_date)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Organisation */}
                {property.organisation && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Agency</h4>
                    <div className="text-sm text-gray-700">{property.organisation}</div>
                  </div>
                )}

                {/* Description */}
                {property.description && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{property.description}</p>
                  </div>
                )}
              </div>

              {/* Nearby Contacts */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Nearby Contacts ({nearbyContacts.length})
                  </h3>

                  {loading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                      <span className="ml-3 text-gray-600">Loading contacts...</span>
                    </div>
                  ) : nearbyContacts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      No contacts found within 5km of this property
                    </div>
                  ) : (
                    <>
                      <div className="max-h-96 overflow-y-auto space-y-3">
                        {nearbyContacts.map((contact) => (
                          <div
                            key={contact.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedContacts.includes(contact.id)
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => handleContactSelection(contact.id)}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-4 h-4 border-2 rounded ${
                                selectedContacts.includes(contact.id)
                                  ? 'bg-primary-600 border-primary-600'
                                  : 'border-gray-300'
                              }`}>
                                {selectedContacts.includes(contact.id) && (
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">
                                  {contact.first_name} {contact.last_name}
                                </div>
                                {contact.address && (
                                  <div className="text-sm text-gray-500">{contact.address}</div>
                                )}
                                <div className="text-sm text-gray-500 space-x-2">
                                  {contact.email && <span>{contact.email}</span>}
                                  {contact.phone && <span>{contact.phone}</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {selectedContacts.length > 0 && (
                        <div className="mt-6 p-4 bg-primary-50 rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-3">
                            Contact Selected ({selectedContacts.length})
                          </h4>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleCommunicate('email')}
                              className="flex-1 btn-primary text-sm"
                              disabled={!nearbyContacts.some(c => selectedContacts.includes(c.id) && c.email)}
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.44a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              Email
                            </button>
                            <button
                              onClick={() => handleCommunicate('text')}
                              className="flex-1 btn-secondary text-sm"
                              disabled={!nearbyContacts.some(c => selectedContacts.includes(c.id) && c.phone)}
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              Text
                            </button>
                            <button
                              onClick={() => handleCommunicate('call')}
                              className="flex-1 btn-secondary text-sm"
                              disabled={!nearbyContacts.some(c => selectedContacts.includes(c.id) && c.phone)}
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              Call
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Communication History */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Communication History
                  </h3>

                  {loadingHistory ? (
                    <div className="flex items-center justify-center h-20">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                      <span className="ml-3 text-gray-600">Loading history...</span>
                    </div>
                  ) : communicationHistory.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p className="text-sm">No communications yet</p>
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto space-y-3">
                      {communicationHistory.map((comm) => (
                        <div key={comm.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className={`badge text-xs ${
                                comm.communication_type === 'email' ? 'bg-blue-100 text-blue-800' :
                                comm.communication_type === 'text' ? 'bg-green-100 text-green-800' :
                                comm.communication_type === 'call' ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {comm.communication_type}
                              </span>
                              <span className="text-sm font-medium text-gray-900">
                                {comm.contact_name}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {formatDate(comm.sent_at)}
                            </span>
                          </div>
                          {comm.subject && (
                            <div className="text-sm font-medium text-gray-800 mb-1">
                              {comm.subject}
                            </div>
                          )}
                          <div className="text-xs text-gray-600 line-clamp-2">
                            {comm.message}
                          </div>
                          {comm.tags && comm.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {comm.tags.map((tag: string, index: number) => (
                                <span key={index} className="badge text-xs bg-gray-100 text-gray-600">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Communication Confirmation Modal */}
      {showCommunicationModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {communicationType === 'email' ? 'Send Email' :
                 communicationType === 'text' ? 'Send Text Message' : 'Make Call'}
              </h3>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Selected contacts ({selectedContacts.length}):
                </p>
                <div className="space-y-1">
                  {nearbyContacts
                    .filter(c => selectedContacts.includes(c.id))
                    .map(contact => (
                      <div key={contact.id} className="text-sm font-medium">
                        {contact.first_name} {contact.last_name}
                        {communicationType === 'email' && contact.email && (
                          <span className="text-gray-500 ml-2">({contact.email})</span>
                        )}
                        {(communicationType === 'text' || communicationType === 'call') && contact.phone && (
                          <span className="text-gray-500 ml-2">({contact.phone})</span>
                        )}
                      </div>
                    ))
                  }
                </div>
              </div>

              {communicationType === 'email' && (
                <div className="mb-4 p-3 bg-gray-50 rounded text-sm">
                  <strong>Preview:</strong>
                  <div className="mt-2 whitespace-pre-line">{generatePropertyMessage()}</div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowCommunicationModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendCommunication}
                  className="btn-primary"
                >
                  {communicationType === 'email' ? 'Open Email App' :
                   communicationType === 'text' ? 'Open Messages App' : 'Open Phone App'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

interface Contact {
  id: string
  user_id: string
  name: string
  first_name?: string
  last_name?: string
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

interface ContactDetailsModalProps {
  contact: Contact
  onClose: () => void
}

export function ContactDetailsModal({ contact, onClose }: ContactDetailsModalProps) {
  const { user } = useAuth()
  const [nearbyProperties, setNearbyProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProperties, setSelectedProperties] = useState<string[]>([])
  const [showCommunicationModal, setShowCommunicationModal] = useState(false)
  const [communicationType, setCommunicationType] = useState<'email' | 'text' | 'call'>('email')
  const [communicationHistory, setCommunicationHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    fetchNearbyProperties()
    fetchCommunicationHistory()
  }, [contact])

  const fetchNearbyProperties = async () => {
    if (!contact.lat || !contact.lng || !user) return

    try {
      // Get all properties for the user
      const { data: properties, error } = await supabase
        .from('properties')
        .select('*')
        .eq('user_id', user.id)
        .not('lat', 'is', null)
        .not('lng', 'is', null)

      if (error) throw error

      // Filter by distance (simple approximation for nearby properties)
      const nearby = properties?.filter(property => {
        if (!property.lat || !property.lng) return false
        const distance = calculateDistance(
          contact.lat!, contact.lng!,
          property.lat, property.lng
        )
        return distance <= 10 // 10km radius for properties
      }) || []

      // Sort by distance and status (sold properties first as they're good market references)
      const sorted = nearby.sort((a, b) => {
        // Prioritize sold properties
        if (a.status === 'sold' && b.status !== 'sold') return -1
        if (b.status === 'sold' && a.status !== 'sold') return 1

        // Then sort by distance
        const distanceA = calculateDistance(contact.lat!, contact.lng!, a.lat!, a.lng!)
        const distanceB = calculateDistance(contact.lat!, contact.lng!, b.lat!, b.lng!)
        return distanceA - distanceB
      })

      setNearbyProperties(sorted)
    } catch (error) {
      console.error('Error fetching nearby properties:', error)
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
    if (!user || !contact) return

    setLoadingHistory(true)
    try {
      const { data, error } = await supabase
        .from('communication_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('contact_id', contact.id)
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

  const handlePropertySelection = (propertyId: string) => {
    setSelectedProperties(prev =>
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    )
  }

  const handleCommunicate = (type: 'email' | 'text' | 'call') => {
    setCommunicationType(type)
    setShowCommunicationModal(true)
  }

  const generatePropertiesMessage = () => {
    const selectedProps = nearbyProperties.filter(p => selectedProperties.includes(p.id))

    if (selectedProps.length === 0) return ''

    let message = `Hi ${contact.first_name || contact.name || 'there'},\n\nI thought you might be interested in these recent property activities in your area:\n\n`

    selectedProps.forEach((property, index) => {
      const priceStr = property.status === 'sold' && property.sale_price
        ? `Sold for ${formatPrice(property.sale_price)}`
        : `Listed at ${formatPrice(property.price)}`

      const details = []
      if (property.bedrooms) details.push(`${property.bedrooms} bed`)
      if (property.bathrooms) details.push(`${property.bathrooms} bath`)
      if (property.floor_area) details.push(`${property.floor_area}m²`)

      message += `${index + 1}. ${property.address}\n`
      message += `   ${priceStr} - ${property.property_type.charAt(0).toUpperCase() + property.property_type.slice(1)}\n`
      if (details.length > 0) {
        message += `   ${details.join(' • ')}\n`
      }
      if (property.sale_date) {
        message += `   Sold: ${formatDate(property.sale_date)}\n`
      }
      message += '\n'
    })

    message += `These recent sales/listings show the current market activity in your neighborhood. `
    message += `If you're considering buying or selling, I'd be happy to discuss how these compare to your property value and current market opportunities.\n\n`
    message += `Would you like to schedule a brief call to discuss your property goals?\n\n`
    message += `Best regards`

    return message
  }

  const handleSendCommunication = async () => {
    if (selectedProperties.length === 0) return

    const selectedProps = nearbyProperties.filter(p => selectedProperties.includes(p.id))
    const subject = `Property Market Update - ${contact.address || 'Your Area'}`
    let message = ''

    try {
      if (communicationType === 'email') {
        message = generatePropertiesMessage()
      } else if (communicationType === 'text') {
        // Create SMS with property details (shorter version)
        message = `Hi ${contact.first_name || 'there'}! Recent property activity near you:\n\n`

        selectedProps.slice(0, 2).forEach((property, index) => { // Limit to 2 for SMS
          const priceStr = property.status === 'sold' && property.sale_price
            ? `Sold ${formatPrice(property.sale_price)}`
            : `Listed ${formatPrice(property.price)}`
          message += `${index + 1}. ${property.address} - ${priceStr}\n`
        })

        if (selectedProps.length > 2) {
          message += `...and ${selectedProps.length - 2} more properties.\n`
        }

        message += `\nInterested in your property value? Let's chat!`
      } else if (communicationType === 'call') {
        message = `Called regarding ${selectedProps.length} nearby properties: ${selectedProps.map(p => p.address).join(', ')}`
      }

      // Record communication history
      await supabase.from('communication_history').insert({
        user_id: user?.id,
        contact_id: contact.id,
        contact_name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.name || 'Unknown',
        contact_email: contact.email,
        contact_phone: contact.phone,
        property_id: selectedProps.length === 1 ? selectedProps[0].id : null,
        property_address: selectedProps.length === 1 ? selectedProps[0].address : null,
        communication_type: communicationType,
        subject: communicationType === 'email' ? subject : null,
        message: message,
        context: 'market_update',
        related_properties: selectedProps.map(p => p.id),
        tags: ['market_update', 'nearby_properties'],
        sent_at: new Date().toISOString()
      })

      // Open communication apps
      if (communicationType === 'email' && contact.email) {
        const mailtoLink = `mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`
        window.open(mailtoLink, '_blank')
      } else if (communicationType === 'text' && contact.phone) {
        const smsLink = `sms:${contact.phone}?body=${encodeURIComponent(message)}`
        window.open(smsLink, '_blank')
      } else if (communicationType === 'call' && contact.phone) {
        window.open(`tel:${contact.phone}`, '_blank')
      }

      // Refresh communication history
      await fetchCommunicationHistory()

    } catch (error) {
      console.error('Error recording communication:', error)
      alert('Communication sent but there was an issue saving the record.')
    }

    setShowCommunicationModal(false)
    setSelectedProperties([])
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sold':
        return 'bg-blue-100 text-blue-800'
      case 'listed':
        return 'bg-green-100 text-green-800'
      case 'withdrawn':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Contact Details</h2>
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
              {/* Contact Information */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {contact.first_name && contact.last_name
                      ? `${contact.first_name} ${contact.last_name}`
                      : contact.name
                    }
                  </h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    {contact.email && (
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.44a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {contact.email}
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {contact.phone}
                      </div>
                    )}
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      {contact.address}
                    </div>
                  </div>
                </div>

                {/* Contact Details */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Contact Information</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Source:</span>
                      <span className="ml-2 font-medium capitalize">{contact.contact_source}</span>
                    </div>
                    {contact.last_contact_date && (
                      <div>
                        <span className="text-gray-600">Last Contact:</span>
                        <span className="ml-2 font-medium">{formatDate(contact.last_contact_date)}</span>
                      </div>
                    )}
                    {contact.follow_up_date && (
                      <div>
                        <span className="text-gray-600">Follow Up:</span>
                        <span className="ml-2 font-medium">{formatDate(contact.follow_up_date)}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-600">Added:</span>
                      <span className="ml-2 font-medium">{formatDate(contact.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {contact.tags && contact.tags.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {contact.tags.map((tag, index) => (
                        <span key={index} className="badge bg-blue-100 text-blue-800">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {contact.notes && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{contact.notes}</p>
                  </div>
                )}
              </div>

              {/* Nearby Properties */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Nearby Properties ({nearbyProperties.length})
                  </h3>

                  {loading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                      <span className="ml-3 text-gray-600">Loading properties...</span>
                    </div>
                  ) : nearbyProperties.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                      </svg>
                      No properties found within 10km of this contact
                    </div>
                  ) : (
                    <>
                      <div className="max-h-96 overflow-y-auto space-y-3">
                        {nearbyProperties.map((property) => (
                          <div
                            key={property.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedProperties.includes(property.id)
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => handlePropertySelection(property.id)}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-4 h-4 border-2 rounded ${
                                selectedProperties.includes(property.id)
                                  ? 'bg-primary-600 border-primary-600'
                                  : 'border-gray-300'
                              }`}>
                                {selectedProperties.includes(property.id) && (
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <div className="font-medium text-gray-900">{property.address}</div>
                                  <span className={`badge text-xs ${getStatusColor(property.status)}`}>
                                    {property.status}
                                  </span>
                                </div>
                                <div className="text-sm font-semibold text-primary-600">
                                  {property.status === 'sold' && property.sale_price
                                    ? `Sold: ${formatPrice(property.sale_price)}`
                                    : formatPrice(property.price)
                                  }
                                </div>
                                <div className="text-xs text-gray-500 space-x-2">
                                  <span className="capitalize">{property.property_type}</span>
                                  {property.bedrooms && <span>• {property.bedrooms} bed</span>}
                                  {property.bathrooms && <span>• {property.bathrooms} bath</span>}
                                  {property.floor_area && <span>• {property.floor_area}m²</span>}
                                </div>
                                {property.sold_date && (
                                  <div className="text-xs text-gray-500">
                                    Sold: {formatDate(property.sold_date)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {selectedProperties.length > 0 && (
                        <div className="mt-6 p-4 bg-primary-50 rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-3">
                            Properties Selected ({selectedProperties.length})
                          </h4>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleCommunicate('email')}
                              className="flex-1 btn-primary text-sm"
                              disabled={!contact.email}
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.44a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              Email
                            </button>
                            <button
                              onClick={() => handleCommunicate('text')}
                              className="flex-1 btn-secondary text-sm"
                              disabled={!contact.phone}
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              Text
                            </button>
                            <button
                              onClick={() => handleCommunicate('call')}
                              className="flex-1 btn-secondary text-sm"
                              disabled={!contact.phone}
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
                                {comm.context === 'property_alert' ? 'Property Alert' :
                                 comm.context === 'market_update' ? 'Market Update' :
                                 comm.context || 'Communication'}
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
                          {comm.related_properties && comm.related_properties.length > 0 && (
                            <div className="mt-2 text-xs text-blue-600">
                              Related to {comm.related_properties.length} property{comm.related_properties.length !== 1 ? 'ies' : ''}
                            </div>
                          )}
                          {comm.tags && comm.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {comm.tags.map((tag, index) => (
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
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {communicationType === 'email' ? 'Send Property Update Email' :
                 communicationType === 'text' ? 'Send Property Update Text' : 'Call Contact'}
              </h3>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Contact: {contact.first_name && contact.last_name
                    ? `${contact.first_name} ${contact.last_name}`
                    : contact.name}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Selected properties ({selectedProperties.length}):
                </p>
                <div className="space-y-1 mb-4 max-h-32 overflow-y-auto">
                  {nearbyProperties
                    .filter(p => selectedProperties.includes(p.id))
                    .map(property => (
                      <div key={property.id} className="text-sm">
                        <span className="font-medium">{property.address}</span>
                        <span className="text-gray-500 ml-2">
                          - {property.status === 'sold' && property.sale_price
                            ? `Sold ${formatPrice(property.sale_price)}`
                            : formatPrice(property.price)
                          }
                        </span>
                      </div>
                    ))
                  }
                </div>
              </div>

              {(communicationType === 'email' || communicationType === 'text') && (
                <div className="mb-4 p-3 bg-gray-50 rounded text-sm max-h-64 overflow-y-auto">
                  <strong>Message Preview:</strong>
                  <div className="mt-2 whitespace-pre-line">{generatePropertiesMessage()}</div>
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
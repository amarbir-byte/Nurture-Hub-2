import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { TemplateSelector } from '../common/TemplateSelector'
import { type MessageTemplate, replaceTemplateVariables } from '../../utils/messageTemplates'
import { MapTilerMap } from '../ui/MapTilerMap'

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
  const [radius, setRadius] = useState(10) // Default 10km radius
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null)

  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden'

    return () => {
      // Restore body scroll when modal is closed
      document.body.style.overflow = 'unset'
    }
  }, []) // Empty dependency array means this runs once on mount and once on unmount

  useEffect(() => {
    fetchNearbyProperties()
    fetchCommunicationHistory()
  }, [contact, radius])

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
        return distance <= radius // Dynamic radius for properties
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
    setSelectedTemplate(null) // Reset template selection
    setShowCommunicationModal(true)
  }

  const generatePropertiesMessage = () => {
    if (selectedTemplate) {
      const selectedProps = nearbyProperties.filter(p => selectedProperties.includes(p.id))
      const propertiesList = selectedProps.map(prop => {
        const priceStr = prop.sale_price
          ? formatPrice(prop.sale_price)
          : prop.price
          ? formatPrice(prop.price)
          : 'Price not available'
        return `${prop.address} - ${priceStr} • ${prop.property_type}`
      }).join(', ')

      const variables = {
        contact_name: contact.first_name || contact.name || 'there',
        area: 'your area', // Could be derived from contact address
        properties_list: propertiesList,
        agent_name: 'Your Agent'
      }
      
      const { message } = replaceTemplateVariables(selectedTemplate, variables)
      return message
    }

    // Fallback to original message
    const selectedProps = nearbyProperties.filter(p => selectedProperties.includes(p.id))

    if (selectedProps.length === 0) return ''

    let message = `Hi ${contact.first_name || contact.name || 'there'},\n\nI thought you might be interested in these recent property activities in your area:\n\n`

    selectedProps.forEach((property, index) => {
      const priceStr = property.sale_price
        ? `Sold for ${formatPrice(property.sale_price)}`
        : property.price
        ? `Listed at ${formatPrice(property.price)}`
        : 'Price not available'

      const details = []
      if (property.bedrooms) details.push(`${property.bedrooms} bed`)
      if (property.bathrooms) details.push(`${property.bathrooms} bath`)
      if (property.floor_area) details.push(`${property.floor_area}m²`)

      message += `${index + 1}. ${property.address}\n`
      message += `   ${priceStr} - ${property.property_type.charAt(0).toUpperCase() + property.property_type.slice(1)}\n`
      if (details.length > 0) {
        message += `   ${details.join(' • ')}\n`
      }
      if (property.sold_date) {
        message += `   Sold: ${formatDate(property.sold_date)}\n`
      }
      message += '\n'
    })

    message += `These recent sales/listings show the current market activity in your neighborhood. `
    message += `If you're considering buying or selling, I'd be happy to discuss how these compare to your property value and current market opportunities.\n\n`
    message += `Would you like to schedule a brief call to discuss your property goals?\n\n`
    message += `Best regards`

    return message
  }

  const generatePropertiesSubject = () => {
    if (selectedTemplate && selectedTemplate.subject) {
      const variables = {
        contact_name: contact.first_name || contact.name || 'there',
        area: 'your area',
        agent_name: 'Your Agent'
      }
      
      const { subject } = replaceTemplateVariables(selectedTemplate, variables)
      return subject
    }
    
    return `Properties Near You - ${contact.first_name || contact.name || 'Contact'}`
  }

  const handleSendCommunication = async () => {
    if (selectedProperties.length === 0) return

    const selectedProps = nearbyProperties.filter(p => selectedProperties.includes(p.id))
    const subject = generatePropertiesSubject()
    let message = ''

    try {
      if (communicationType === 'email') {
        message = generatePropertiesMessage()
      } else if (communicationType === 'text') {
        if (selectedTemplate) {
          message = generatePropertiesMessage()
        } else {
          // Create SMS with property details (shorter version)
          message = `Hi ${contact.first_name || 'there'}! Recent property activity near you:\n\n`

          selectedProps.slice(0, 2).forEach((property, index) => { // Limit to 2 for SMS
            const priceStr = property.sale_price
              ? `Sold ${formatPrice(property.sale_price)}`
              : property.price
              ? `Listed ${formatPrice(property.price)}`
              : 'Price N/A'
          message += `${index + 1}. ${property.address} - ${priceStr}\n`
        })

        if (selectedProps.length > 2) {
          message += `...and ${selectedProps.length - 2} more properties.\n`
        }

        message += `\nInterested in your property value? Let's chat!`
        }
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
        const mailtoLink = `mailto:${contact.email}?subject=${encodeURIComponent(subject || 'Property Update')}&body=${encodeURIComponent(message)}`
        window.open(mailtoLink, '_self')
      } else if (communicationType === 'text' && contact.phone) {
        const cleanPhone = contact.phone.replace(/[^\d+]/g, '')
        const smsLink = `sms:${cleanPhone}?body=${encodeURIComponent(message)}`
        window.open(smsLink, '_self')
      } else if (communicationType === 'call' && contact.phone) {
        const cleanPhone = contact.phone.replace(/[^\d+]/g, '')
        window.open(`tel:${cleanPhone}`, '_self')
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
        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Contact Details</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-md text-primary-400 dark:text-primary-300 hover:text-primary-600 dark:hover:text-primary-100"
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
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {contact.first_name && contact.last_name
                      ? `${contact.first_name} ${contact.last_name}`
                      : contact.name
                    }
                  </h3>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-primary-300">
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
                <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Contact Information</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-primary-300">Source:</span>
                      <span className="ml-2 font-medium capitalize text-gray-900 dark:text-white">{contact.contact_source}</span>
                    </div>
                    {contact.last_contact_date && (
                      <div>
                        <span className="text-gray-600 dark:text-primary-300">Last Contact:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">{formatDate(contact.last_contact_date)}</span>
                      </div>
                    )}
                    {contact.follow_up_date && (
                      <div>
                        <span className="text-gray-600 dark:text-primary-300">Follow Up:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">{formatDate(contact.follow_up_date)}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-600 dark:text-primary-300">Added:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">{formatDate(contact.created_at)}</span>
                      </div>
                  </div>
                </div>

                {/* Tags */}
                {contact.tags && contact.tags.length > 0 && (
                  <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {contact.tags.map((tag, index) => (
                        <span key={index} className="badge bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {contact.notes && (
                  <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Notes</h4>
                    <p className="text-sm text-gray-700 dark:text-primary-300 whitespace-pre-wrap">{contact.notes}</p>
                  </div>
                )}
              </div>

              {/* Map Visualization */}
              {contact.lat && contact.lng && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Location & Proximity Map
                    </h3>
                    <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700 overflow-hidden">
                      <MapTilerMap
                        center={[contact.lng, contact.lat]}
                        zoom={13}
                        markers={[
                          {
                            id: contact.id,
                            lat: contact.lat,
                            lng: contact.lng,
                            title: contact.first_name && contact.last_name
                              ? `${contact.first_name} ${contact.last_name}`
                              : contact.name,
                            type: 'contact',
                            color: '#10B981'
                          },
                          ...nearbyProperties.map(property => ({
                            id: property.id,
                            lat: property.lat!,
                            lng: property.lng!,
                            title: property.address,
                            type: 'property' as const,
                            color: '#3B82F6'
                          }))
                        ]}
                        showRadius={true}
                        radiusKm={radius}
                        radiusCenter={[contact.lng, contact.lat]}
                        height="400px"
                        className="border-0"
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm text-gray-600 dark:text-primary-300">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                          <span>Contact</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                          <span>Properties ({nearbyProperties.length})</span>
                        </div>
                      </div>
                      <div>
                        Search radius: {radius.toFixed(1)}km
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Nearby Properties */}
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Nearby Properties ({nearbyProperties.length})
                    </h3>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-primary-300">
                        Radius: {radius.toFixed(1)}km
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="25.0"
                        step="0.5"
                        value={radius}
                        onChange={(e) => setRadius(parseFloat(e.target.value))}
                        className="w-24 h-2 bg-gray-200 dark:bg-dark-700 rounded-lg appearance-none cursor-pointer slider"
                      />
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                      <span className="ml-3 text-gray-600 dark:text-primary-300">Loading properties...</span>
                    </div>
                  ) : nearbyProperties.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-primary-400">
                      <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-primary-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                      </svg>
                      No properties found within {radius}km of this contact
                    </div>
                  ) : (
                    <>
                      <div className="max-h-96 overflow-y-auto space-y-3">
                        {nearbyProperties.map((property) => (
                          <div
                            key={property.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedProperties.includes(property.id)
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                : 'border-gray-200 hover:border-gray-300 dark:border-dark-700 dark:hover:border-dark-600'
                            }`}
                            onClick={() => handlePropertySelection(property.id)}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-4 h-4 border-2 rounded ${
                                selectedProperties.includes(property.id)
                                  ? 'bg-primary-600 border-primary-600'
                                  : 'border-gray-300 dark:border-dark-600'
                              }`}>
                                {selectedProperties.includes(property.id) && (
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <div className="font-medium text-gray-900 dark:text-white">{property.address}</div>
                                  <span className={`badge text-xs ${getStatusColor(property.status)}`}>
                                    {property.status}
                                  </span>
                                </div>
                                <div className="text-sm font-semibold text-primary-600 dark:text-primary-300">
                                  {property.sale_price
                                    ? `Sold: ${formatPrice(property.sale_price)}`
                                    : property.price
                                    ? formatPrice(property.price)
                                    : 'Price N/A'
                                  }
                                </div>
                                <div className="text-xs text-gray-500 dark:text-primary-400 space-x-2">
                                  <span className="capitalize">{property.property_type}</span>
                                  {property.bedrooms && <span>• {property.bedrooms} bed</span>}
                                  {property.bathrooms && <span>• {property.bathrooms} bath</span>}
                                  {property.floor_area && <span>• {property.floor_area}m²</span>}
                                </div>
                                {property.sold_date && (
                                  <div className="text-xs text-gray-500 dark:text-primary-400">
                                    Sold: {formatDate(property.sold_date)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {selectedProperties.length > 0 && (
                        <div className="mt-6 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                            Properties Selected ({selectedProperties.length})
                          </h4>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleCommunicate('email')}
                              className="flex-1 btn-secondary text-sm"
                              disabled={!contact.email}
                            >
                              Email
                            </button>
                            <button
                              onClick={() => handleCommunicate('text')}
                              className="flex-1 btn-primary text-sm"
                              disabled={!contact.phone}
                            >
                              Text
                            </button>
                            <button
                              onClick={() => handleCommunicate('call')}
                              className="flex-1 btn-secondary text-sm"
                              disabled={!contact.phone}
                            >
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
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Communication History
                  </h3>

                  {loadingHistory ? (
                    <div className="flex items-center justify-center h-20">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                      <span className="ml-3 text-gray-600 dark:text-primary-300">Loading history...</span>
                    </div>
                  ) : communicationHistory.length === 0 ? (
                    <div className="text-center py-6 text-gray-500 dark:text-primary-400">
                      <svg className="mx-auto h-8 w-8 text-gray-400 dark:text-primary-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p className="text-sm">No communications yet</p>
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto space-y-3">
                      {communicationHistory.map((comm) => (
                        <div key={comm.id} className="p-3 bg-gray-50 dark:bg-dark-700 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className={`badge text-xs ${
                                comm.communication_type === 'email' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                                comm.communication_type === 'text' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                comm.communication_type === 'call' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                                'bg-gray-100 text-gray-800 dark:bg-dark-600 dark:text-primary-300'
                              }`}>
                                {comm.communication_type}
                              </span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {comm.contact_name}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-primary-400">
                              {formatDate(comm.sent_at)}
                            </span>
                          </div>
                          {comm.subject && (
                            <div className="text-sm font-medium text-gray-800 dark:text-primary-200 mb-1">
                              {comm.subject}
                            </div>
                          )}
                          <div className="text-xs text-gray-600 dark:text-primary-300 line-clamp-2">
                            {comm.message}
                          </div>
                          {comm.related_properties && comm.related_properties.length > 0 && (
                            <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                              Related to {comm.related_properties.length} property{comm.related_properties.length !== 1 ? 'ies' : ''}
                            </div>
                          )}
                          {comm.tags && comm.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {comm.tags.map((tag: string, index: number) => (
                                <span key={index} className="badge text-xs bg-gray-100 dark:bg-dark-600 text-gray-600 dark:text-primary-300">
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
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {communicationType === 'email' ? 'Send Email' :
                 communicationType === 'text' ? 'Send Text Message' : 'Make Call'}
              </h3>

              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-primary-300 mb-2">
                  Selected contacts ({selectedProperties.length}):
                </p>
                <div className="space-y-1">
                  {nearbyProperties
                    .filter(p => selectedProperties.includes(p.id))
                    .map((property: Property) => (
                      <div key={property.id} className="text-sm font-medium text-gray-900 dark:text-white">
                        {property.address}
                        {communicationType === 'email' && contact.email && (
                          <span className="text-gray-500 dark:text-primary-400 ml-2">({contact.email})</span>
                        )}
                        {(communicationType === 'text' || communicationType === 'call') && contact.phone && (
                          <span className="text-gray-500 dark:text-primary-400 ml-2">({contact.phone})</span>
                        )}
                      </div>
                    ))
                  }
                </div>
              </div>

              {/* Template Selection */}
              {(communicationType === 'email' || communicationType === 'text') && (
                <div className="mb-4">
                  <TemplateSelector
                    type={communicationType === 'text' ? 'sms' : communicationType}
                    category="property"
                    selectedTemplateId={selectedTemplate?.id}
                    onTemplateSelect={setSelectedTemplate}
                  />
                </div>
              )}

              {/* Message Preview */}
              {(communicationType === 'email' || communicationType === 'text') && (
                <div className="mb-4 p-3 bg-gray-50 dark:bg-dark-700 rounded text-sm text-gray-900 dark:text-white">
                  <strong>Preview:</strong>
                  {selectedTemplate && (
                    <div className="text-xs text-gray-600 dark:text-primary-300 mb-2">
                      Using template: {selectedTemplate.name}
                    </div>
                  )}
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
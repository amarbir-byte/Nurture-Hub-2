import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { TemplateSelector } from '../common/TemplateSelector'
import { type MessageTemplate, replaceTemplateVariables } from '../../utils/messageTemplates'

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

interface SMSModalProps {
  contact: Contact
  onClose: () => void
  onSent?: () => void
}

export function SMSModal({ contact, onClose, onSent }: SMSModalProps) {
  const { user } = useAuth()
  const [nearbyProperties, setNearbyProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProperties, setSelectedProperties] = useState<string[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null)
  const [customMessage, setCustomMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [radius, setRadius] = useState(10) // Default 10km radius

  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden'

    return () => {
      // Restore body scroll when modal is closed
      document.body.style.overflow = 'unset'
    }
  }, [])

  useEffect(() => {
    fetchNearbyProperties()
  }, [contact, radius])

  const fetchNearbyProperties = async () => {
    if (!contact.lat || !contact.lng || !user) {
      setLoading(false)
      return
    }

    try {
      // Get all properties for the user
      const { data: properties, error } = await supabase
        .from('properties')
        .select('*')
        .eq('user_id', user.id)
        .not('lat', 'is', null)
        .not('lng', 'is', null)

      if (error) throw error

      // Filter by distance and prioritize sold properties
      const nearby = properties?.filter(property => {
        if (!property.lat || !property.lng) return false
        const distance = calculateDistance(
          contact.lat!, contact.lng!,
          property.lat, property.lng
        )
        return distance <= radius
      }) || []

      // Sort by status (sold properties first) then by distance
      const sorted = nearby.sort((a, b) => {
        // Prioritize sold properties for SMS (good market references)
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

  const generateMessageContent = (): string => {
    const selectedProps = nearbyProperties.filter(p => selectedProperties.includes(p.id))
    const firstSelectedProperty = selectedProps.length > 0 ? selectedProps[0] : null

    const baseVariables: Record<string, string> = {
      contact_name: contact.first_name || contact.name || 'there',
      agent_name: user?.user_metadata?.full_name || 'Your Agent',
      agent_phone: user?.phone || '+64 21 123 4567',
      company_name: 'Your Company',
      date: new Date().toLocaleDateString('en-NZ'),
      time: new Date().toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' }),
      area: contact.suburb || contact.city || 'your area',
    }

    if (firstSelectedProperty) {
      Object.assign(baseVariables, {
        property_address: firstSelectedProperty.address,
        property_price: firstSelectedProperty.sale_price
          ? formatPrice(firstSelectedProperty.sale_price)
          : firstSelectedProperty.price
          ? formatPrice(firstSelectedProperty.price)
          : 'Price available on request',
        property_type: firstSelectedProperty.property_type.charAt(0).toUpperCase() + firstSelectedProperty.property_type.slice(1),
        bedrooms: firstSelectedProperty.bedrooms?.toString() || '',
        bathrooms: firstSelectedProperty.bathrooms?.toString() || '',
        floor_area: firstSelectedProperty.floor_area?.toString() || '',
        property_description: firstSelectedProperty.description || '',
        old_price: firstSelectedProperty.price ? formatPrice(firstSelectedProperty.price) : 'N/A',
        new_price: firstSelectedProperty.sale_price ? formatPrice(firstSelectedProperty.sale_price) : 'N/A',
        savings_amount: (firstSelectedProperty.price && firstSelectedProperty.sale_price)
          ? formatPrice(firstSelectedProperty.price - firstSelectedProperty.sale_price)
          : 'N/A',
      })
    }

    if (selectedTemplate) {
      const { message } = replaceTemplateVariables(selectedTemplate, baseVariables)
      return message
    }

    return customMessage || ''
  }

  const finalMessage = generateMessageContent()

  const handleSend = async () => {
    if (!finalMessage.trim() || !contact.phone) return

    setSending(true)
    try {
      // Clean phone number for SMS
      const cleanPhone = contact.phone.replace(/[^\d+]/g, '')

      // Record the communication in the database
      const { error } = await supabase
        .from('communication_history')
        .insert({
          user_id: user?.id,
          contact_id: contact.id,
          contact_name: contact.name,
          contact_email: contact.email,
          contact_phone: contact.phone,
          communication_type: 'text',
          message: finalMessage,
          context: 'sms_contact',
          related_properties: selectedProperties.length > 0 ? selectedProperties : null,
          sent_at: new Date().toISOString()
        })

      if (error) throw error

      // Open SMS app with the message
      const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(finalMessage)}`
      window.open(smsUrl, '_self')

      onSent?.()
      onClose()
    } catch (error) {
      console.error('Error sending SMS:', error)
    } finally {
      setSending(false)
    }
  }

  const soldProperties = nearbyProperties.filter(p => p.status === 'sold')
  const activeProperties = nearbyProperties.filter(p => p.status === 'listed')

  const modalContent = (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-8"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Send SMS to {contact.name}</h2>
            <p className="text-sm text-gray-600">{contact.phone}</p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onClose()
            }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex min-h-0">
          {/* Left Panel - Template Selection and Properties */}
          <div className="w-2/5 border-r border-gray-200 flex flex-col">
            <div className="flex-1 overflow-y-auto p-6">
            {/* Template Selection */}
            <div className="mb-6">
              <TemplateSelector
                type="sms"
                category="property"
                selectedTemplateId={selectedTemplate?.id}
                onTemplateSelect={setSelectedTemplate}
              />
            </div>

            {/* Radius Control */}
            {contact.lat && contact.lng && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Radius: {radius}km
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1km</span>
                  <span>50km</span>
                </div>
              </div>
            )}

            {/* Nearby Properties */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Nearby Properties</h3>

              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Loading nearby properties...</p>
                </div>
              ) : nearbyProperties.length === 0 ? (
                <p className="text-gray-500 text-sm">No nearby properties found within {radius}km.</p>
              ) : (
                <div className="space-y-4">
                  {/* Sold Properties Section */}
                  {soldProperties.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-green-700 mb-2">Recently Sold (Great for market references)</h4>
                      <div className="space-y-2">
                        {soldProperties.map((property) => (
                          <div
                            key={property.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedProperties.includes(property.id)
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => handlePropertySelection(property.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{property.address}</p>
                                <div className="text-xs text-gray-600 mt-1">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mr-2">
                                    Sold
                                  </span>
                                  {property.sale_price && formatPrice(property.sale_price)}
                                  {property.bedrooms && ` • ${property.bedrooms} bed`}
                                  {property.bathrooms && ` • ${property.bathrooms} bath`}
                                  {property.sold_date && ` • Sold ${formatDate(property.sold_date)}`}
                                </div>
                              </div>
                              <div className="ml-3">
                                <input
                                  type="checkbox"
                                  checked={selectedProperties.includes(property.id)}
                                  onChange={() => handlePropertySelection(property.id)}
                                  className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Active Properties Section */}
                  {activeProperties.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-blue-700 mb-2">Currently Listed</h4>
                      <div className="space-y-2">
                        {activeProperties.map((property) => (
                          <div
                            key={property.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedProperties.includes(property.id)
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => handlePropertySelection(property.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{property.address}</p>
                                <div className="text-xs text-gray-600 mt-1">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                                    Listed
                                  </span>
                                  {property.price && formatPrice(property.price)}
                                  {property.bedrooms && ` • ${property.bedrooms} bed`}
                                  {property.bathrooms && ` • ${property.bathrooms} bath`}
                                  {property.listing_date && ` • Listed ${formatDate(property.listing_date)}`}
                                </div>
                              </div>
                              <div className="ml-3">
                                <input
                                  type="checkbox"
                                  checked={selectedProperties.includes(property.id)}
                                  onChange={() => handlePropertySelection(property.id)}
                                  className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            </div>
          </div>

          {/* Right Panel - Message Preview and Send */}
          <div className="w-3/5 flex flex-col">
            <div className="flex-1 overflow-y-auto p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Message Preview</h3>

              {/* Custom Message Input (when no template selected) */}
              {!selectedTemplate && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Custom Message
                  </label>
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Type your custom SMS message here...&#10;&#10;Tip: Keep it under 160 characters for a single SMS!"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-base resize-none"
                    rows={8}
                  />
                  <div className="mt-2 text-xs text-gray-500">
                    {customMessage.length}/160 characters
                  </div>
                </div>
              )}

              {/* Message Preview */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Final Message Preview
                </label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 min-h-[200px] max-h-[300px] overflow-y-auto text-base whitespace-pre-wrap">
                  {finalMessage || (
                    <span className="text-gray-400 text-sm">
                      {selectedTemplate ? 'Select properties above to see template preview' : 'Enter your custom message above to see preview'}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    {finalMessage.length} characters
                  </span>
                  {finalMessage.length > 160 && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                      ⚠️ Message will be sent as {Math.ceil(finalMessage.length / 160)} SMS parts
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Send Button Footer */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {finalMessage.trim() ? (
                    <>Ready to send to <strong>{contact.phone}</strong></>
                  ) : (
                    'Please enter a message or select a template'
                  )}
                </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={sending}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!finalMessage.trim() || !contact.phone || sending}
                    className="px-8 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {sending ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </>
                    ) : (
                      '📱 Send SMS'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
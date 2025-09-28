import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
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

interface Template {
  id: string
  user_id: string
  name: string
  content: string
  category: 'listing' | 'sold' | 'follow_up' | 'marketing' | 'sms' | 'custom'
  placeholders: string[]
  is_default: boolean
  usage_count: number
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
  const [sending, setSending] = useState(false)
  const [radius, setRadius] = useState(10) // Default 10km radius
  const [smsTemplate, setSmsTemplate] = useState<Template | null>(null)

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
    fetchSMSTemplate()
  }, [contact, radius])

  const fetchSMSTemplate = async () => {
    if (!user) {
      setTemplateLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('user_id', user.id)
        .or('category.eq.sms,and(category.eq.custom,name.ilike.*SMS*)')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) throw error

      if (data && data.length > 0) {
        setSmsTemplate(data[0])
      }
    } catch (error) {
      console.error('Error fetching SMS template:', error)
    } finally {
      setTemplateLoading(false)
    }
  }

  const fetchNearbyProperties = async () => {
    if (!contact.lat || !contact.lng || !user) {
      setLoading(false)
      return
    }

    try {
      // Get only SOLD properties for the user (for SMS marketing references)
      const { data: properties, error } = await supabase
        .from('properties')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'sold')
        .not('lat', 'is', null)
        .not('lng', 'is', null)

      if (error) throw error

      // Filter by distance - only sold properties within radius
      const nearby = properties?.filter(property => {
        if (!property.lat || !property.lng) return false
        const distance = calculateDistance(
          contact.lat!, contact.lng!,
          property.lat, property.lng
        )
        return distance <= radius
      }) || []

      // Sort by distance (closest first)
      const sorted = nearby.sort((a, b) => {
        const distanceA = calculateDistance(contact.lat!, contact.lng!, a.lat!, a.lng!)
        const distanceB = calculateDistance(contact.lat!, contact.lng!, b.lat!, b.lng!)
        return distanceA - distanceB
      })

      setNearbyProperties(sorted)

      // Auto-select the closest property if none are selected and properties exist
      if (sorted.length > 0 && selectedProperties.length === 0) {
        setSelectedProperties([sorted[0].id])
      }
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


  const handlePropertySelection = (propertyId: string) => {
    setSelectedProperties(prev =>
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    )
  }

  const generateMessageContent = (): string => {
    const selectedProps = nearbyProperties.filter(p => selectedProperties.includes(p.id))

    if (selectedProps.length === 0) {
      return ''
    }

    // Use custom template if available, otherwise fallback to default messages
    if (smsTemplate && smsTemplate.content) {
      return replacePlaceholders(smsTemplate.content, selectedProps)
    }

    // Fallback to default hardcoded messages if no template found
    const contactName = contact.first_name || contact.name || 'homeowner'
    const agentName = user?.user_metadata?.full_name || 'Your Agent'

    if (selectedProps.length === 1) {
      const property = selectedProps[0]
      const price = property.sale_price ? formatPrice(property.sale_price) : (property.price ? formatPrice(property.price) : 'recently')

      return `Hi ${contactName}! The property at ${property.address} has been sold ${property.sale_price ? `for ${price}` : 'recently'}. Given the current market activity in your area, this might be a great time to consider your options. I'd love to discuss what this means for your property value. - ${agentName}`
    } else {
      // Multiple properties selected
      const priceRange = selectedProps.map(p => p.sale_price || p.price).filter(Boolean)
      const avgPrice = priceRange.length > 0 ? priceRange.reduce((a, b) => a + b, 0) / priceRange.length : 0

      return `Hi ${contactName}! I wanted to let you know that ${selectedProps.length} properties in your area have recently sold${avgPrice > 0 ? ` with prices around ${formatPrice(avgPrice)}` : ''}. The market is quite active right now. Would you like to discuss what this means for your property value? - ${agentName}`
    }
  }

  const replacePlaceholders = (template: string, selectedProps: Property[]): string => {
    let message = template

    // Replace basic placeholders
    const contactName = contact.first_name || contact.name || 'homeowner'
    const agentName = user?.user_metadata?.full_name || 'Your Agent'

    message = message.replace(/\[ContactName\]/g, contactName)
    message = message.replace(/\[AgentName\]/g, agentName)

    // Replace property-specific placeholders
    if (selectedProps.length === 1) {
      const property = selectedProps[0]
      const price = property.sale_price ? formatPrice(property.sale_price) : (property.price ? formatPrice(property.price) : 'recently')

      message = message.replace(/\[PropertyCount\]/g, `The property at ${property.address} has been sold`)
      message = message.replace(/\[PropertyDetails\]/g, property.sale_price ? `for ${price}` : 'recently')
    } else {
      const priceRange = selectedProps.map(p => p.sale_price || p.price).filter(Boolean)
      const avgPrice = priceRange.length > 0 ? priceRange.reduce((a, b) => a + b, 0) / priceRange.length : 0

      message = message.replace(/\[PropertyCount\]/g, `${selectedProps.length} properties`)
      message = message.replace(/\[PropertyDetails\]/g, `have recently sold${avgPrice > 0 ? ` with prices around ${formatPrice(avgPrice)}` : ''}`)
    }

    return message
  }

  const finalMessage = generateMessageContent()

  const handleSend = async () => {
    if (selectedProperties.length === 0 || !finalMessage.trim() || !contact.phone) return

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

  // All properties are sold (filtered at database level)
  const soldProperties = nearbyProperties

  const modalContent = (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-2 sm:p-4 lg:p-8"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }}
    >
      <div
        className="bg-white rounded-lg sm:rounded-xl shadow-2xl w-full max-w-sm sm:max-w-lg lg:max-w-xl max-h-[80vh] sm:max-h-[70vh] lg:max-h-[60vh] flex flex-col overflow-hidden"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Send SMS to {contact.name}</h2>
            <p className="text-xs sm:text-sm text-gray-600">{contact.phone}</p>
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

        {/* Main Content - Properties Selection */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6">
            <div className="mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Select Sold Properties</h3>
              <p className="text-xs sm:text-sm text-gray-600">Choose recently sold properties to create a personalized market update message.</p>
            </div>

            {/* Radius Control */}
            {contact.lat && contact.lng && (
              <div className="flex-shrink-0 mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Search Radius: {radius}km
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1km</span>
                  <span>50km</span>
                </div>
              </div>
            )}

            {/* Nearby Sold Properties */}
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex-shrink-0 mb-4">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Nearby Sold Properties</h3>
                <p className="text-xs text-gray-600">Perfect for market reference messages</p>
              </div>

              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Loading...</p>
                </div>
              ) : nearbyProperties.length === 0 ? (
                <p className="text-gray-500 text-sm">No sold properties found within {radius}km.</p>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  <div className="space-y-2 pr-2">
                    {soldProperties.slice(0, 8).map((property) => (
                    <div
                      key={property.id}
                      className={`p-2.5 border rounded-lg cursor-pointer transition-colors ${
                        selectedProperties.includes(property.id)
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handlePropertySelection(property.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{property.address}</p>
                          <div className="text-xs text-gray-600 mt-1 flex items-center">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mr-2 flex-shrink-0">
                              Sold
                            </span>
                            <span className="truncate">
                              {property.sale_price && formatPrice(property.sale_price)}
                              {property.bedrooms && ` • ${property.bedrooms}bed`}
                              {property.bathrooms && ` • ${property.bathrooms}bath`}
                            </span>
                          </div>
                        </div>
                        <div className="ml-2 flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={selectedProperties.includes(property.id)}
                            onChange={(e) => {
                              e.stopPropagation()
                              handlePropertySelection(property.id)
                            }}
                            onClick={(e) => e.stopPropagation()}
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
          </div>
        </div>

        {/* Send Button Footer */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row sm:justify-between items-center space-y-3 sm:space-y-0">
            <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
              {selectedProperties.length > 0 ? (
                <>Ready to send to <strong>{contact.phone}</strong></>
              ) : (
                'Select properties above to generate message'
              )}
            </div>
            <div className="flex space-x-2 sm:space-x-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-colors text-sm"
                disabled={sending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={selectedProperties.length === 0 || !contact.phone || sending}
                className="flex-1 sm:flex-none px-4 sm:px-8 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
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
  )

  return createPortal(modalContent, document.body)
}
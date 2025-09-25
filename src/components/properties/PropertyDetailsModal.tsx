import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { MapTilerMap } from '../ui/MapTilerMap'
import { TemplateSelector } from '../common/TemplateSelector'
import { type MessageTemplate, replaceTemplateVariables } from '../../utils/messageTemplates'

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
    fetchNearbyContacts()
    fetchCommunicationHistory()
  }, [property, radius])

  const fetchNearbyContacts = async () => {
    if (!property.lat || !property.lng || !user) return

    try {
      // Get contacts within 10km radius
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
        return distance <= radius // Dynamic radius
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
    setSelectedTemplate(null) // Reset template selection
    setShowCommunicationModal(true)
  }

  const generatePropertyMessage = (
    selectedTemplate: MessageTemplate | null,
    property: Property,
    contact: Contact | null, // Pass a specific contact if available, or null
    formatPrice: (price: number) => string
  ): string => {
    const baseVariables: Record<string, string> = {
      contact_name: contact?.first_name || contact?.last_name ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() : 'there',
      property_address: property.address,
      property_price: property.sale_price 
        ? formatPrice(property.sale_price)
        : property.price 
        ? formatPrice(property.price)
        : 'Price not available',
      property_type: property.property_type.charAt(0).toUpperCase() + property.property_type.slice(1),
      bedrooms: property.bedrooms?.toString() || '',
      bathrooms: property.bathrooms?.toString() || '',
      floor_area: property.floor_area?.toString() || '',
      property_description: property.description || '',
      agent_name: 'Your Agent', // This would come from user profile
      agent_phone: '+64 21 123 4567', // This would come from user profile
      old_price: property.price ? formatPrice(property.price) : 'N/A',
      new_price: property.sale_price ? formatPrice(property.sale_price) : 'N/A',
      savings_amount: (property.price && property.sale_price) ? formatPrice(property.price - property.sale_price) : 'N/A',
      contact_address: contact?.address || 'their address',
      suburb: property.address.split(',')[1]?.trim() || 'the area', // Basic suburb extraction
      city: property.address.split(',').pop()?.trim() || 'the city', // Basic city extraction
    };
    
    if (selectedTemplate) {
      const { message } = replaceTemplateVariables(selectedTemplate, baseVariables);
      // Using non-null assertion as MessageTemplate.message is defined as string
      return message!; 
    }

    // Fallback to original message if no template is selected
    const priceStr = property.sale_price
      ? `Sold for ${formatPrice(property.sale_price)}`
      : property.price
      ? `Listed at ${formatPrice(property.price)}`
      : 'Price not available'

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

  const generatePropertySubject = (
    selectedTemplate: MessageTemplate | null,
    property: Property,
    contact: Contact | null,
    formatPrice: (price: number) => string
  ): string => {
    const baseVariables: Record<string, string> = {
      contact_name: contact?.first_name || contact?.last_name ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() : 'there',
      property_address: property.address,
      property_price: property.sale_price 
        ? formatPrice(property.sale_price)
        : property.price 
        ? formatPrice(property.price)
        : 'Price not available',
      agent_name: 'Your Agent'
    };

    if (selectedTemplate && selectedTemplate.subject) {
      const { subject } = replaceTemplateVariables(selectedTemplate, baseVariables);
      // Using non-null assertion as MessageTemplate.subject is defined as string | undefined,
      // but if it exists, replaceTemplateVariables ensures it's a string.
      return subject!;
    }
    
    return `Property Update: ${property.address}`
  }

  const handleSendCommunication = async () => {
    if (selectedContacts.length === 0) return

    const selectedContactsData = nearbyContacts.filter(c => selectedContacts.includes(c.id))
    
    // For multi-contact send, we'll generate the message for the first contact as a preview
    // and then generate individually for each contact when opening the app.
    // The stored message will be the generic one or the template-based one.
    const genericSubject = generatePropertySubject(selectedTemplate, property, null, formatPrice);
    const genericMessage = generatePropertyMessage(selectedTemplate, property, null, formatPrice);


    try {
      // Record communication history for each contact
      const communicationPromises = selectedContactsData.map(contact => {
        // Generate message specifically for each contact to fill 'contact_name' etc.
        const personalizedSubject = generatePropertySubject(selectedTemplate, property, contact, formatPrice);
        const personalizedMessage = generatePropertyMessage(selectedTemplate, property, contact, formatPrice);

        return supabase.from('communication_history').insert({
          user_id: user?.id,
          contact_id: contact.id,
          contact_name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown',
          contact_email: contact.email,
          contact_phone: contact.phone,
          property_id: property.id,
          property_address: property.address,
          communication_type: communicationType,
          subject: communicationType === 'email' ? personalizedSubject : null,
          message: personalizedMessage,
          context: 'property_alert',
          related_properties: [property.id],
          tags: ['property_marketing', 'nearby_contact'],
          sent_at: new Date().toISOString()
        })
      })

      await Promise.all(communicationPromises)

      // Open communication apps
      if (communicationType === 'email') {
        const emails = selectedContactsData.map(c => c.email).filter(Boolean)
        if (emails.length > 0) {
          // For email, we can send a single email to multiple recipients (BCC)
          // or open multiple mailto links. For simplicity, let's open one with BCC.
          const mailtoLink = `mailto:?bcc=${emails.join(',')}&subject=${encodeURIComponent(genericSubject || 'Property Update')}&body=${encodeURIComponent(genericMessage)}`
          window.open(mailtoLink, '_self')
        }
      } else if (communicationType === 'text') {
        const phones = selectedContactsData.map(c => c.phone).filter(Boolean)
        if (phones.length > 0) {
          // For SMS, typically one message per recipient.
          // We'll open the first one, user can manually send others.
          // Or, for a more integrated solution, this would hit an SMS API.
          phones.forEach(phone => {
            if (phone) {
              const cleanPhone = phone.replace(/[^\d+]/g, '')
              const personalizedMessage = generatePropertyMessage(selectedTemplate, property, selectedContactsData.find(c => c.phone === phone) || null, formatPrice);
              const smsLink = `sms:${cleanPhone}?body=${encodeURIComponent(personalizedMessage)}`
              window.open(smsLink, '_self')
            }
          })
        }
      } else if (communicationType === 'call') {
        const phones = selectedContactsData.map(c => c.phone).filter(Boolean)
        if (phones.length > 0 && phones[0]) {
          const cleanPhone = phones[0].replace(/[^\d+]/g, '')
          window.open(`tel:${cleanPhone}`, '_self')
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

  const formatPreviewMessage = (contact: Contact | null) => {
    return generatePropertyMessage(selectedTemplate, property, contact, formatPrice);
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

  return (
    <>
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Property Details</h2>
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
              {/* Property Information */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{property.address}</h3>
                  <div className="flex items-center space-x-2 mb-4">
                    <span className={`badge ${property.status === 'sold' ? 'bg-blue-100 text-blue-800' : property.status === 'listed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-primary-300 capitalize">
                      {property.property_type.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Price Information */}
                <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Price Information</h4>
                  <div className="space-y-2">
                    {property.status === 'sold' && property.sale_price ? (
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        Sold: {formatPrice(property.sale_price)}
                      </div>
                    ) : (
                      <div className="text-2xl font-bold text-primary-600 dark:text-primary-300">
                        {formatPrice(property.sale_price || property.price)}
                      </div>
                    )}
                    {property.list_price && property.list_price !== property.price && (
                      <div className="text-sm text-gray-600 dark:text-primary-300">Listed: {formatPrice(property.list_price)}</div>
                    )}
                    {property.days_to_sell && (
                      <div className="text-sm text-gray-600 dark:text-primary-300">Days to sell: {property.days_to_sell}</div>
                    )}
                  </div>
                </div>

                {/* Property Details */}
                <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Property Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {property.bedrooms && (
                      <div>
                        <span className="text-gray-600 dark:text-primary-300">Bedrooms:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">{property.bedrooms}</span>
                      </div>
                    )}
                    {property.bathrooms && (
                      <div>
                        <span className="text-gray-600 dark:text-primary-300">Bathrooms:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">{property.bathrooms}</span>
                      </div>
                    )}
                    {property.floor_area && (
                      <div>
                        <span className="text-gray-600 dark:text-primary-300">Floor Area:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">{property.floor_area}m²</span>
                      </div>
                    )}
                    {property.land_area_m2 && (
                      <div>
                        <span className="text-gray-600 dark:text-primary-300">Land Area:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">{property.land_area_m2}m²</span>
                      </div>
                    )}
                    {property.land_area_ha && (
                      <div>
                        <span className="text-gray-600 dark:text-primary-300">Land Area:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">{property.land_area_ha}ha</span>
                      </div>
                    )}
                    {property.sale_method && (
                      <div>
                        <span className="text-gray-600 dark:text-primary-300">Sale Method:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">{property.sale_method}</span>
                      </div>
                    )}
                    {property.sale_category && (
                      <div>
                        <span className="text-gray-600 dark:text-primary-300">Sale Category:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">{property.sale_category}</span>
                      </div>
                    )}
                    {property.new_dwelling !== undefined && (
                      <div>
                        <span className="text-gray-600 dark:text-primary-300">New Dwelling:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">{property.new_dwelling ? 'Yes' : 'No'}</span>
                      </div>
                    )}
                    {property.sale_tenure && (
                      <div>
                        <span className="text-gray-600 dark:text-primary-300">Tenure:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">{property.sale_tenure}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dates */}
                <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Important Dates</h4>
                  <div className="space-y-2 text-sm">
                    {property.listing_date && (
                      <div>
                        <span className="text-gray-600 dark:text-primary-300">Listed:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">{formatDate(property.listing_date)}</span>
                      </div>
                    )}
                    {property.sold_date && (
                      <div>
                        <span className="text-gray-600 dark:text-primary-300">Sold:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">{formatDate(property.sold_date)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Organisation */}
                {property.organisation && (
                  <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Agency</h4>
                    <div className="text-sm text-gray-700 dark:text-primary-300">{property.organisation}</div>
                  </div>
                )}

                {/* Description */}
                {property.description && (
                  <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Description</h4>
                    <p className="text-sm text-gray-700 dark:text-primary-300 whitespace-pre-wrap">{property.description}</p>
                  </div>
                )}
              </div>

              {/* Map Visualization */}
              {property.lat && property.lng && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Location & Proximity Map
                    </h3>
                    <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700 overflow-hidden">
                      <MapTilerMap
                        center={[property.lng, property.lat]}
                        zoom={13}
                        markers={[
                          {
                            id: property.id,
                            lat: property.lat,
                            lng: property.lng,
                            title: property.address,
                            type: 'property',
                            color: '#3B82F6'
                          },
                          ...nearbyContacts.map(contact => ({
                            id: contact.id,
                            lat: contact.lat!,
                            lng: contact.lng!,
                            title: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Contact',
                            type: 'contact' as const,
                            color: '#10B981'
                          }))
                        ]}
                        showRadius={true}
                        radiusKm={radius}
                        radiusCenter={[property.lng, property.lat]}
                        height="400px"
                        className="border-0"
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm text-gray-600 dark:text-primary-300">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                          <span>Property</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                          <span>Contacts ({nearbyContacts.length})</span>
                        </div>
                      </div>
                      <div>
                        Search radius: {radius.toFixed(1)}km
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Nearby Contacts */}
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Nearby Contacts ({nearbyContacts.length})
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
                      <span className="ml-3 text-gray-600 dark:text-primary-300">Loading contacts...</span>
                    </div>
                  ) : nearbyContacts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-primary-400">
                      <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-primary-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      No contacts found within {radius}km of this property
                    </div>
                  ) : (
                    <>
                      <div className="max-h-96 overflow-y-auto space-y-3">
                        {nearbyContacts.map((contact) => (
                          <div
                            key={contact.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedContacts.includes(contact.id)
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                : 'border-gray-200 hover:border-gray-300 dark:border-dark-700 dark:hover:border-dark-600'
                            }`}
                            onClick={() => handleContactSelection(contact.id)}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-4 h-4 border-2 rounded ${
                                selectedContacts.includes(contact.id)
                                  ? 'bg-primary-600 border-primary-600'
                                  : 'border-gray-300 dark:border-dark-600'
                              }`}>
                                {selectedContacts.includes(contact.id) && (
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {contact.first_name} {contact.last_name}
                                </div>
                                {contact.address && (
                                  <div className="text-sm text-gray-500 dark:text-primary-400">{contact.address}</div>
                                )}
                                <div className="text-sm text-gray-500 dark:text-primary-400 space-x-2">
                                  {contact.email && <span>{contact.email}</span>}
                                  {contact.phone && <span>{contact.phone}</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {selectedContacts.length > 0 && (
                        <div className="mt-6 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                            Contact Selected ({selectedContacts.length})
                          </h4>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleCommunicate('email')}
                              className="flex-1 btn-secondary text-sm"
                              disabled={!nearbyContacts.some(c => selectedContacts.includes(c.id) && c.email)}
                            >
                              Email
                            </button>
                            <button
                              onClick={() => handleCommunicate('text')}
                              className="flex-1 btn-primary text-sm"
                              disabled={!nearbyContacts.some(c => selectedContacts.includes(c.id) && c.phone)}
                            >
                              Text
                            </button>
                            <button
                              onClick={() => handleCommunicate('call')}
                              className="flex-1 btn-secondary text-sm"
                              disabled={!nearbyContacts.some(c => selectedContacts.includes(c.id) && c.phone)}
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
                                comm.communication_type === 'email' ? 'bg-blue-100 text-blue-800' :
                                comm.communication_type === 'text' ? 'bg-green-100 text-green-800' :
                                comm.communication_type === 'call' ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800'
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
                  Selected contacts ({selectedContacts.length}):
                </p>
                <div className="space-y-1">
                  {selectedContactsData
                    .map((contact) => (
                      <div key={contact.id} className="text-sm font-medium text-gray-900 dark:text-white">
                        {contact.first_name} {contact.last_name}
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
                  {/* Display preview message for the first selected contact, or a generic one */}
                  <div className="mt-2 whitespace-pre-line">{formatPreviewMessage(selectedContactsData[0] || null)}</div>
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
import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

interface Property {
  id: string
  address: string
  status: string
  price: number
  property_type: string
  lat: number
  lng: number
}

interface Contact {
  id: string
  name: string
  address: string
  phone?: string
  lat: number
  lng: number
}

interface Template {
  id: string
  name: string
  content: string
  category: string
  placeholders: string[]
  usage_count: number
}

interface CampaignWizardProps {
  properties: Property[]
  onComplete: () => void
  onCancel: () => void
}

type Step = 'property' | 'radius' | 'message' | 'confirm'

export function CampaignWizard({ properties, onComplete, onCancel }: CampaignWizardProps) {
  const { user } = useAuth()
  const [step, setStep] = useState<Step>('property')
  const [loading, setLoading] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [radius, setRadius] = useState(1.0)
  const [nearbyContacts, setNearbyContacts] = useState<Contact[]>([])
  const [message, setMessage] = useState('')
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  useEffect(() => {
    if (selectedProperty && step === 'radius') {
      findNearbyContacts()
    }
  }, [selectedProperty, radius, step])

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('user_id', user?.id)
        .order('usage_count', { ascending: false })

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371 // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const findNearbyContacts = async () => {
    if (!selectedProperty) return

    try {
      // Get all contacts with location data
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user?.id)
        .not('lat', 'is', null)
        .not('lng', 'is', null)

      if (error) throw error

      // Filter contacts within radius
      const contactsInRadius = (data || []).filter(contact => {
        const distance = calculateDistance(
          selectedProperty.lat,
          selectedProperty.lng,
          contact.lat,
          contact.lng
        )
        return distance <= radius
      })

      setNearbyContacts(contactsInRadius)
    } catch (error) {
      console.error('Error finding nearby contacts:', error)
    }
  }

  const processTemplate = (template: string, property: Property): string => {
    let processed = template

    // Replace property placeholders
    const replacements: Record<string, string> = {
      'PropertyAddress': property.address,
      'PropertyPrice': new Intl.NumberFormat('en-NZ', {
        style: 'currency',
        currency: 'NZD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(property.sale_price || property.price || 0),
      'PropertyType': property.property_type,
      'AgentName': 'Your Name', // This would come from user profile
      'AgentPhone': '+64 21 123 4567', // This would come from user profile
      'CompanyName': 'Your Company', // This would come from user profile
      'Date': new Date().toLocaleDateString('en-NZ'),
      'Time': new Date().toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' }),
    }

    Object.entries(replacements).forEach(([placeholder, value]) => {
      const regex = new RegExp(`\\[${placeholder}\\]`, 'g')
      processed = processed.replace(regex, value)
    })

    return processed
  }

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template)
    if (selectedProperty) {
      const processedMessage = processTemplate(template.content, selectedProperty)
      setMessage(processedMessage)
    }
  }

  const createCampaign = async () => {
    if (!selectedProperty || !message.trim()) return

    setLoading(true)
    try {
      // Create campaign record
      const { error } = await supabase
        .from('campaigns')
        .insert([{
          user_id: user?.id,
          property_id: selectedProperty.id,
          message: message.trim(),
          recipients_count: nearbyContacts.length,
          radius: radius,
          campaign_type: 'sms',
          sent_at: new Date().toISOString(),
        }])

      if (error) throw error

      // Update template usage count if template was used
      if (selectedTemplate) {
        await supabase
          .from('templates')
          .update({ usage_count: selectedTemplate.usage_count + 1 })
          .eq('id', selectedTemplate.id)
      }

      onComplete()
    } catch (error) {
      console.error('Error creating campaign:', error)
      alert('Error creating campaign. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getStepNumber = (currentStep: Step): number => {
    const steps: Step[] = ['property', 'radius', 'message', 'confirm']
    return steps.indexOf(currentStep) + 1
  }

  const canProceed = () => {
    switch (step) {
      case 'property':
        return selectedProperty !== null
      case 'radius':
        return nearbyContacts.length > 0
      case 'message':
        return message.trim().length > 0
      case 'confirm':
        return true
      default:
        return false
    }
  }

  const nextStep = () => {
    const steps: Step[] = ['property', 'radius', 'message', 'confirm']
    const currentIndex = steps.indexOf(step)
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1])
    }
  }

  const prevStep = () => {
    const steps: Step[] = ['property', 'radius', 'message', 'confirm']
    const currentIndex = steps.indexOf(step)
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1])
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Create Marketing Campaign</h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center">
              {['property', 'radius', 'message', 'confirm'].map((stepName, index) => (
                <div key={stepName} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    getStepNumber(step) > index + 1 ? 'bg-green-600 text-white' :
                    getStepNumber(step) === index + 1 ? 'bg-primary-600 text-white' :
                    'bg-gray-300 text-gray-600'
                  }`}>
                    {getStepNumber(step) > index + 1 ? '✓' : index + 1}
                  </div>
                  {index < 3 && (
                    <div className={`flex-1 h-1 mx-2 ${
                      getStepNumber(step) > index + 1 ? 'bg-green-600' : 'bg-gray-300'
                    }`}></div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-600">
              <span>Select Property</span>
              <span>Set Radius</span>
              <span>Compose Message</span>
              <span>Confirm & Send</span>
            </div>
          </div>

          {/* Step Content */}
          <div className="mb-8">
            {/* Step 1: Property Selection */}
            {step === 'property' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Select Property for Campaign</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {properties.map((property) => (
                    <div
                      key={property.id}
                      onClick={() => setSelectedProperty(property)}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedProperty?.id === property.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`badge ${
                          property.status === 'listed' ? 'bg-green-100 text-green-800' :
                          property.status === 'sold' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                        </span>
                        <span className="text-sm text-gray-600 capitalize">{property.property_type}</span>
                      </div>
                      <h4 className="font-medium text-gray-900 mb-1">{property.address}</h4>
                      <p className="text-lg font-semibold text-primary-600">
                        {new Intl.NumberFormat('en-NZ', {
                          style: 'currency',
                          currency: 'NZD',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(property.sale_price || property.price || 0)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Radius Selection */}
            {step === 'radius' && selectedProperty && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Set Search Radius</h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        Radius: {radius.toFixed(1)}km
                      </label>
                      <span className="text-sm text-gray-600">
                        {nearbyContacts.length} contacts found
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="5.0"
                      step="0.1"
                      value={radius}
                      onChange={(e) => setRadius(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0.1km</span>
                      <span>2.5km</span>
                      <span>5.0km</span>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Campaign Target</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Property: <span className="font-medium">{selectedProperty.address}</span>
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Search Radius:</span>
                        <span className="ml-2 font-medium">{radius.toFixed(1)}km</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Contacts Found:</span>
                        <span className="ml-2 font-medium text-primary-600">{nearbyContacts.length}</span>
                      </div>
                    </div>

                    {nearbyContacts.length > 0 && (
                      <div className="mt-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Nearby Contacts Preview:</h5>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {nearbyContacts.slice(0, 5).map((contact) => (
                            <div key={contact.id} className="text-xs text-gray-600 flex justify-between">
                              <span>{contact.name}</span>
                              <span>{contact.address}</span>
                            </div>
                          ))}
                          {nearbyContacts.length > 5 && (
                            <div className="text-xs text-gray-500">
                              +{nearbyContacts.length - 5} more contacts
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {nearbyContacts.length === 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex">
                        <svg className="h-5 w-5 text-yellow-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">No contacts found</h3>
                          <p className="mt-1 text-sm text-yellow-700">
                            Try increasing the radius or add more contacts with addresses near this property.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Message Composition */}
            {step === 'message' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Compose Your Message</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Templates */}
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">Choose Template (Optional)</h4>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {templates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => handleTemplateSelect(template)}
                          className={`w-full p-3 text-left border rounded-lg hover:border-gray-300 ${
                            selectedTemplate?.id === template.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-900">{template.name}</span>
                            <span className="text-xs text-gray-500 capitalize">{template.category}</span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">{template.content}</p>
                        </button>
                      ))}
                      {templates.length === 0 && (
                        <p className="text-sm text-gray-500">No templates available. Create some templates first.</p>
                      )}
                    </div>
                  </div>

                  {/* Message Editor */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-700">Message Content</h4>
                      <span className={`text-sm ${
                        message.length <= 160 ? 'text-green-600' :
                        message.length <= 320 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {message.length} chars • {Math.ceil(message.length / 160)} SMS
                      </span>
                    </div>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="input-field w-full min-h-32"
                      placeholder="Write your SMS message here..."
                      rows={8}
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      Tip: Keep under 160 characters for single SMS. Personalization placeholders have been replaced with actual values.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Confirmation */}
            {step === 'confirm' && selectedProperty && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Campaign Details</h3>
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Campaign Summary</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Property:</span>
                        <p className="font-medium">{selectedProperty.address}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Search Radius:</span>
                        <p className="font-medium">{radius.toFixed(1)}km</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Recipients:</span>
                        <p className="font-medium text-primary-600">{nearbyContacts.length} contacts</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Message Length:</span>
                        <p className="font-medium">{message.length} chars ({Math.ceil(message.length / 160)} SMS)</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Message Preview</h4>
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <p className="text-sm whitespace-pre-wrap">{message}</p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Important Note</h4>
                    <p className="text-sm text-blue-800">
                      This is a demo version. In production, this would integrate with an SMS provider to send actual messages.
                      For now, we'll create the campaign record for tracking purposes.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={step === 'property' ? onCancel : prevStep}
              className="btn-secondary"
              disabled={loading}
            >
              {step === 'property' ? 'Cancel' : 'Previous'}
            </button>

            {step === 'confirm' ? (
              <button
                onClick={createCampaign}
                className="btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Campaign...
                  </div>
                ) : (
                  'Create Campaign'
                )}
              </button>
            ) : (
              <button
                onClick={nextStep}
                className="btn-primary"
                disabled={!canProceed()}
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
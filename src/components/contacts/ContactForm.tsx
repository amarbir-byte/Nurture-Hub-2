import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

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

interface ContactFormProps {
  contact?: Contact | null
  onSave: () => void
  onCancel: () => void
}

interface FormData {
  name: string
  email: string
  phone: string
  address: string
  suburb: string
  city: string
  postal_code: string
  notes: string
  last_contact_date: string
  follow_up_date: string
  contact_source: 'manual' | 'import' | 'campaign' | 'referral'
  tags: string
}

export function ContactForm({ contact, onSave, onCancel }: ContactFormProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<FormData>>({})

  const [formData, setFormData] = useState<FormData>({
    name: contact?.name || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    address: contact?.address || '',
    suburb: contact?.suburb || '',
    city: contact?.city || '',
    postal_code: contact?.postal_code || '',
    notes: contact?.notes || '',
    last_contact_date: contact?.last_contact_date || '',
    follow_up_date: contact?.follow_up_date || '',
    contact_source: contact?.contact_source || 'manual',
    tags: contact?.tags?.join(', ') || '',
  })

  const mockGeocode = async (address: string) => {
    const nzCities = [
      { name: 'Auckland', lat: -36.8485, lng: 174.7633 },
      { name: 'Wellington', lat: -41.2865, lng: 174.7762 },
      { name: 'Christchurch', lat: -43.5321, lng: 172.6362 },
      { name: 'Hamilton', lat: -37.7870, lng: 175.2793 },
      { name: 'Tauranga', lat: -37.6878, lng: 176.1651 },
    ]

    const randomCity = nzCities[Math.floor(Math.random() * nzCities.length)]
    return {
      lat: randomCity.lat + (Math.random() - 0.5) * 0.1,
      lng: randomCity.lng + (Math.random() - 0.5) * 0.1,
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required'
    }

    if (formData.email && !isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (formData.phone && !isValidPhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const isValidPhone = (phone: string): boolean => {
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,}$/
    return phoneRegex.test(phone)
  }

  const parseTags = (tagString: string): string[] => {
    return tagString
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const coordinates = await mockGeocode(formData.address)
      const tags = parseTags(formData.tags)

      const contactData = {
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        address: formData.address.trim(),
        suburb: formData.suburb.trim() || null,
        city: formData.city.trim() || null,
        postal_code: formData.postal_code.trim() || null,
        notes: formData.notes.trim() || null,
        last_contact_date: formData.last_contact_date || null,
        follow_up_date: formData.follow_up_date || null,
        contact_source: formData.contact_source,
        tags: tags.length > 0 ? tags : null,
        lat: coordinates.lat,
        lng: coordinates.lng,
        user_id: user?.id,
        updated_at: new Date().toISOString(),
      }

      let result
      if (contact) {
        // Update existing contact
        result = await supabase
          .from('contacts')
          .update(contactData)
          .eq('id', contact.id)
          .eq('user_id', user?.id)
      } else {
        // Create new contact
        result = await supabase
          .from('contacts')
          .insert([{ ...contactData, created_at: new Date().toISOString() }])
      }

      if (result.error) throw result.error

      onSave()
    } catch (error) {
      console.error('Error saving contact:', error)
      alert('Error saving contact. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {contact ? 'Edit Contact' : 'Add New Contact'}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name & Source */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`input-field ${errors.name ? 'border-red-500' : ''}`}
                  placeholder="John Smith"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="contact_source" className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Source
                </label>
                <select
                  id="contact_source"
                  value={formData.contact_source}
                  onChange={(e) => handleInputChange('contact_source', e.target.value)}
                  className="input-field"
                >
                  <option value="manual">Manual Entry</option>
                  <option value="import">Imported</option>
                  <option value="campaign">From Campaign</option>
                  <option value="referral">Referral</option>
                </select>
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`input-field ${errors.email ? 'border-red-500' : ''}`}
                  placeholder="john@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={`input-field ${errors.phone ? 'border-red-500' : ''}`}
                  placeholder="+64 21 123 4567"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                )}
              </div>
            </div>

            {/* Address */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                Street Address *
              </label>
              <input
                type="text"
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className={`input-field ${errors.address ? 'border-red-500' : ''}`}
                placeholder="123 Main Street"
              />
              {errors.address && (
                <p className="mt-1 text-sm text-red-600">{errors.address}</p>
              )}
            </div>

            {/* Suburb, City, Postal Code */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="suburb" className="block text-sm font-medium text-gray-700 mb-1">
                  Suburb
                </label>
                <input
                  type="text"
                  id="suburb"
                  value={formData.suburb}
                  onChange={(e) => handleInputChange('suburb', e.target.value)}
                  className="input-field"
                  placeholder="Ponsonby"
                />
              </div>

              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="input-field"
                  placeholder="Auckland"
                />
              </div>

              <div>
                <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 mb-1">
                  Postal Code
                </label>
                <input
                  type="text"
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => handleInputChange('postal_code', e.target.value)}
                  className="input-field"
                  placeholder="1011"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="last_contact_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Contact Date
                </label>
                <input
                  type="date"
                  id="last_contact_date"
                  value={formData.last_contact_date}
                  onChange={(e) => handleInputChange('last_contact_date', e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label htmlFor="follow_up_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Follow-up Date
                </label>
                <input
                  type="date"
                  id="follow_up_date"
                  value={formData.follow_up_date}
                  onChange={(e) => handleInputChange('follow_up_date', e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <input
                type="text"
                id="tags"
                value={formData.tags}
                onChange={(e) => handleInputChange('tags', e.target.value)}
                className="input-field"
                placeholder="first-time buyer, investor, motivated (comma separated)"
              />
              <p className="mt-1 text-sm text-gray-500">
                Separate multiple tags with commas
              </p>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="input-field"
                rows={4}
                placeholder="Additional notes about this contact..."
              />
            </div>

            {/* Form Actions */}
            <div className="flex space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </div>
                ) : (
                  contact ? 'Update Contact' : 'Add Contact'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
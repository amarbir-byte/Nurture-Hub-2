import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { ensureUserExists } from '../../utils/userUtils'
import { geocode } from '../../lib/geocoding'
import { AddressAutoCorrect } from '../ui/AddressAutoCorrect'
import type { AddressSuggestion } from '../ui/AddressAutoCorrect'
import { checkDuplicateContact, type DuplicateContactResult } from '../../utils/duplicateCheck'
import type { Contact } from '../../types/contact'

// Using AddressSuggestion from AddressAutoCorrect component

interface ContactFormProps {
  contact?: Contact | null
  onSave: () => void
  onCancel: () => void
}

interface ContactFormData {
  first_name: string
  last_name: string
  email: string
  phone: string
  address: string
  suburb: string
  city: string
  postal_code: string
  notes: string
  last_contact_date: string
  follow_up_date: string
  contact_type: 'buyer' | 'seller' | 'both'
  temperature: 'hot' | 'warm' | 'cold'
  tags: string
  // Property purchase information (for sellers)
  property_purchase_date: string
  property_purchase_price: string
  property_address: string
  property_suburb: string
  property_city: string
  property_postal_code: string
}

export function ContactForm({ contact, onSave, onCancel }: ContactFormProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<ContactFormData>>({})
  const [duplicateCheck, setDuplicateCheck] = useState<{
    show: boolean
    existingContact?: DuplicateContactResult['existingContact']
    samePropertyContacts?: DuplicateContactResult['samePropertyContacts']
    action: 'create' | 'update' | 'cancel'
  }>({ show: false, action: 'create' })

  const [formData, setFormData] = useState<ContactFormData>({
    first_name: contact?.first_name || '',
    last_name: contact?.last_name || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    address: contact?.address || '',
    suburb: contact?.suburb || '',
    city: contact?.city || '',
    postal_code: contact?.postal_code || '',
    notes: contact?.notes || '',
    last_contact_date: contact?.last_contact_date || '',
    follow_up_date: contact?.follow_up_date || '',
    contact_type: contact?.contact_type || 'buyer',
    temperature: contact?.temperature || 'warm',
    tags: contact?.tags?.join(', ') || '',
    // Property purchase information
    property_purchase_date: contact?.property_purchase_date || '',
    property_purchase_price: contact?.property_purchase_price?.toString() || '',
    property_address: contact?.property_address || '',
    property_suburb: contact?.property_suburb || '',
    property_city: contact?.property_city || '',
    property_postal_code: contact?.property_postal_code || '',
  })


  const validateForm = (): boolean => {
    const newErrors: Partial<ContactFormData> = {}

    if (!formData.first_name.trim() && !formData.last_name.trim()) {
      newErrors.first_name = 'First name or last name is required'
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

    // Validate property fields for sellers
    if (formData.contact_type === 'seller' || formData.contact_type === 'both') {
      if (!formData.property_address.trim()) {
        newErrors.property_address = 'Property address is required for sellers'
      }
      if (formData.property_purchase_price && isNaN(Number(formData.property_purchase_price))) {
        newErrors.property_purchase_price = 'Please enter a valid purchase price'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const isValidPhone = (phone: string): boolean => {
    const phoneRegex = /^[+]?[0-9\s\-()]{8,}$/
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

    // If this is a new contact (not editing), check for duplicates
    if (!contact && user) {
      const duplicateResult = await checkDuplicateContact(
        user.id,
        `${formData.first_name} ${formData.last_name}`.trim(),
        formData.phone,
        formData.email,
        formData.address
      )
      
      if (duplicateResult.isDuplicate && duplicateResult.existingContact) {
        setDuplicateCheck({
          show: true,
          existingContact: duplicateResult.existingContact,
          action: 'create'
        })
        return
      }

      // If there are contacts at the same property, show them but allow creation
      if (duplicateResult.samePropertyContacts && duplicateResult.samePropertyContacts.length > 0) {
        setDuplicateCheck({
          show: true,
          samePropertyContacts: duplicateResult.samePropertyContacts,
          action: 'create'
        })
        return
      }
    }

    // If user chose to update existing contact, proceed with update
    if (duplicateCheck.action === 'update' && duplicateCheck.existingContact) {
      await updateExistingContact()
      return
    }

    // If user chose to cancel, close the form
    if (duplicateCheck.action === 'cancel') {
      onCancel()
      return
    }

    // Proceed with normal create/update
    await saveContact()
  }

  const updateExistingContact = async () => {
    if (!user || !duplicateCheck.existingContact) return

    setLoading(true)

    try {
      // Construct complete address for accurate geocoding
      const fullAddress = [
        formData.address.trim(),
        formData.suburb.trim(),
        formData.city.trim(),
        formData.postal_code.trim(),
        'New Zealand'
      ].filter(Boolean).join(', ')

      console.log('Geocoding full address:', fullAddress)
      const coordinates = await geocode(fullAddress)
      
      // Geocode property address if provided
      let propertyCoordinates: { lat: number | null; lng: number | null } = { lat: null, lng: null }
      if (formData.property_address) {
        const propertyFullAddress = [
          formData.property_address.trim(),
          formData.property_suburb.trim(),
          formData.property_city.trim(),
          formData.property_postal_code.trim(),
          'New Zealand'
        ].filter(Boolean).join(', ')
        
        console.log('Geocoding property address:', propertyFullAddress)
        propertyCoordinates = await geocode(propertyFullAddress)
      }
      
      const tags = parseTags(formData.tags)

      const contactData = {
        name: `${formData.first_name.trim()} ${formData.last_name.trim()}`.trim() || 'Unknown', // Legacy field
        first_name: formData.first_name.trim() || null,
        last_name: formData.last_name.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        address: formData.address.trim(),
        suburb: formData.suburb.trim() || null,
        city: formData.city.trim() || null,
        postal_code: formData.postal_code.trim() || null,
        notes: formData.notes.trim() || null,
        last_contact_date: formData.last_contact_date || null,
        follow_up_date: formData.follow_up_date || null,
        contact_type: formData.contact_type,
        temperature: formData.temperature,
        tags: tags.length > 0 ? tags : null,
        lat: coordinates.lat,
        lng: coordinates.lng,
        // Property purchase information
        property_purchase_date: formData.property_purchase_date || null,
        property_purchase_price: formData.property_purchase_price ? Number(formData.property_purchase_price) : null,
        property_address: formData.property_address || null,
        property_suburb: formData.property_suburb || null,
        property_city: formData.property_city || null,
        property_postal_code: formData.property_postal_code || null,
        property_lat: propertyCoordinates.lat,
        property_lng: propertyCoordinates.lng,
        updated_at: new Date().toISOString(),
      }

      const result = await supabase
        .from('contacts')
        .update(contactData)
        .eq('id', duplicateCheck.existingContact.id)
        .eq('user_id', user.id)

      if (result.error) throw result.error

      onSave()
    } catch (error) {
      console.error('Error updating existing contact:', error)
      alert('Error updating contact. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const saveContact = async () => {
    setLoading(true)

    try {
      // Ensure user exists in users table before creating contact
      if (user) {
        await ensureUserExists(user)
      }

      // Construct complete address for accurate geocoding
      const fullAddress = [
        formData.address.trim(),
        formData.suburb.trim(),
        formData.city.trim(),
        formData.postal_code.trim(),
        'New Zealand'
      ].filter(Boolean).join(', ')

      console.log('Geocoding full address:', fullAddress)
      const coordinates = await geocode(fullAddress)
      
      // Geocode property address if provided
      let propertyCoordinates: { lat: number | null; lng: number | null } = { lat: null, lng: null }
      if (formData.property_address) {
        const propertyFullAddress = [
          formData.property_address.trim(),
          formData.property_suburb.trim(),
          formData.property_city.trim(),
          formData.property_postal_code.trim(),
          'New Zealand'
        ].filter(Boolean).join(', ')
        
        console.log('Geocoding property address:', propertyFullAddress)
        propertyCoordinates = await geocode(propertyFullAddress)
      }
      
      const tags = parseTags(formData.tags)

      const contactData = {
        name: `${formData.first_name.trim()} ${formData.last_name.trim()}`.trim() || 'Unknown', // Legacy field
        first_name: formData.first_name.trim() || null,
        last_name: formData.last_name.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        address: formData.address.trim(),
        suburb: formData.suburb.trim() || null,
        city: formData.city.trim() || null,
        postal_code: formData.postal_code.trim() || null,
        notes: formData.notes.trim() || null,
        last_contact_date: formData.last_contact_date || null,
        follow_up_date: formData.follow_up_date || null,
        contact_type: formData.contact_type,
        temperature: formData.temperature,
        tags: tags.length > 0 ? tags : null,
        lat: coordinates.lat,
        lng: coordinates.lng,
        // Property purchase information
        property_purchase_date: formData.property_purchase_date || null,
        property_purchase_price: formData.property_purchase_price ? Number(formData.property_purchase_price) : null,
        property_address: formData.property_address || null,
        property_suburb: formData.property_suburb || null,
        property_city: formData.property_city || null,
        property_postal_code: formData.property_postal_code || null,
        property_lat: propertyCoordinates.lat,
        property_lng: propertyCoordinates.lng,
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

  const handleInputChange = (field: keyof ContactFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleAddressSelect = (suggestion: AddressSuggestion) => {
    // Auto-populate address components when address is selected/corrected
    const addressComponents = suggestion.address_components

    setFormData(prev => ({
      ...prev,
      address: suggestion.formatted_address,
      suburb: addressComponents?.suburb || prev.suburb,
      city: addressComponents?.city || prev.city,
      postal_code: addressComponents?.postal_code || prev.postal_code,
    }))
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
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  className={`input-field ${errors.first_name ? 'border-red-500' : ''}`}
                  placeholder="John"
                />
                {errors.first_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>
                )}
              </div>

              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  className="input-field"
                  placeholder="Smith"
                />
              </div>
            </div>


            {/* Contact Type & Temperature */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="contact_type" className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Type *
                </label>
                <select
                  id="contact_type"
                  value={formData.contact_type}
                  onChange={(e) => handleInputChange('contact_type', e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="buyer">👤 Buyer</option>
                  <option value="seller">🏠 Seller</option>
                  <option value="both">🔄 Both (Buyer & Seller)</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 mb-1">
                  Lead Temperature *
                </label>
                <select
                  id="temperature"
                  value={formData.temperature}
                  onChange={(e) => handleInputChange('temperature', e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="hot">🔥 Hot (Very Interested)</option>
                  <option value="warm">🟡 Warm (Somewhat Interested)</option>
                  <option value="cold">🔵 Cold (Not Interested)</option>
                </select>
              </div>
            </div>

            {/* Property Information (for sellers) */}
            {(formData.contact_type === 'seller' || formData.contact_type === 'both') && (
              <div className="space-y-4">
                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Property Information</h3>
                  
                  {/* Property Address */}
                  <div className="mb-4">
                    <label htmlFor="property_address" className="block text-sm font-medium text-gray-700 mb-1">
                      Property Address *
                    </label>
                    <AddressAutoCorrect
                      value={formData.property_address}
                      onChange={(value: string) => handleInputChange('property_address', value)}
                      onAddressSelect={(result) => {
                        const mainAddress = result.formatted_address
                        const addressComponents = result.address_components
                        
                        setFormData(prev => ({
                          ...prev,
                          property_address: mainAddress,
                          property_suburb: addressComponents?.suburb || prev.property_suburb,
                          property_city: addressComponents?.city || prev.property_city,
                          property_postal_code: addressComponents?.postal_code || prev.property_postal_code,
                        }))
                        
                        console.log('Property address selected:', result)
                        console.log('Parsed property address components:', addressComponents)
                        console.log('Property address field set to:', mainAddress)
                      }}
                      placeholder="Start typing property address... e.g. 123 Main Street, Ponsonby, Auckland"
                      error={errors.property_address}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Address of the property they own
                    </p>
                  </div>

                  {/* Property Suburb, City, Postal Code */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label htmlFor="property_suburb" className="block text-sm font-medium text-gray-700 mb-1">
                        Property Suburb
                      </label>
                      <input
                        type="text"
                        id="property_suburb"
                        value={formData.property_suburb}
                        onChange={(e) => handleInputChange('property_suburb', e.target.value)}
                        className="input-field"
                        placeholder="Ponsonby"
                      />
                    </div>

                    <div>
                      <label htmlFor="property_city" className="block text-sm font-medium text-gray-700 mb-1">
                        Property City
                      </label>
                      <input
                        type="text"
                        id="property_city"
                        value={formData.property_city}
                        onChange={(e) => handleInputChange('property_city', e.target.value)}
                        className="input-field"
                        placeholder="Auckland"
                      />
                    </div>

                    <div>
                      <label htmlFor="property_postal_code" className="block text-sm font-medium text-gray-700 mb-1">
                        Property Postal Code
                      </label>
                      <input
                        type="text"
                        id="property_postal_code"
                        value={formData.property_postal_code}
                        onChange={(e) => handleInputChange('property_postal_code', e.target.value)}
                        className="input-field"
                        placeholder="1021"
                      />
                    </div>
                  </div>

                  {/* Purchase Date and Price */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="property_purchase_date" className="block text-sm font-medium text-gray-700 mb-1">
                        Purchase Date
                      </label>
                      <input
                        type="date"
                        id="property_purchase_date"
                        value={formData.property_purchase_date}
                        onChange={(e) => handleInputChange('property_purchase_date', e.target.value)}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label htmlFor="property_purchase_price" className="block text-sm font-medium text-gray-700 mb-1">
                        Purchase Price
                      </label>
                      <input
                        type="number"
                        id="property_purchase_price"
                        value={formData.property_purchase_price}
                        onChange={(e) => handleInputChange('property_purchase_price', e.target.value)}
                        className={`input-field ${errors.property_purchase_price ? 'border-red-500' : ''}`}
                        placeholder="850000"
                        min="0"
                        step="1000"
                      />
                      {errors.property_purchase_price && (
                        <p className="mt-1 text-sm text-red-600">{errors.property_purchase_price}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

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
              <AddressAutoCorrect
                value={formData.address}
                onChange={(value) => handleInputChange('address', value)}
                onAddressSelect={handleAddressSelect}
                placeholder="Start typing address... e.g. 123 Main Street, Ponsonby, Auckland"
                error={errors.address}
                label="Complete Address"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Select an address to auto-fill suburb, city, and postal code
              </p>
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

      {/* Duplicate Contact Modal */}
      {duplicateCheck.show && (duplicateCheck.existingContact || duplicateCheck.samePropertyContacts) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-60">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  {duplicateCheck.existingContact ? 'Duplicate Contact Found' : 'Contacts at Same Property'}
                </h3>
                <button
                  onClick={() => setDuplicateCheck({ show: false, action: 'create' })}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-6">
                {duplicateCheck.existingContact ? (
                  <>
                    <p className="text-gray-600 mb-4">
                      A contact with the same name and contact details already exists:
                    </p>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="space-y-2">
                        <div>
                          <span className="font-medium text-gray-700">Name:</span>
                          <span className="ml-2 text-gray-600">{duplicateCheck.existingContact.name}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Address:</span>
                          <span className="ml-2 text-gray-600">{duplicateCheck.existingContact.address}</span>
                        </div>
                        {duplicateCheck.existingContact.phone && (
                          <div>
                            <span className="font-medium text-gray-700">Phone:</span>
                            <span className="ml-2 text-gray-600">{duplicateCheck.existingContact.phone}</span>
                          </div>
                        )}
                        {duplicateCheck.existingContact.email && (
                          <div>
                            <span className="font-medium text-gray-700">Email:</span>
                            <span className="ml-2 text-gray-600">{duplicateCheck.existingContact.email}</span>
                          </div>
                        )}
                        <div>
                          <span className="font-medium text-gray-700">Added:</span>
                          <span className="ml-2 text-gray-600">
                            {new Date(duplicateCheck.existingContact.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-gray-600 mb-4">
                      There are already contacts at this property. You can still add this contact if the name or contact details are different:
                    </p>
                    
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="space-y-2">
                        {duplicateCheck.samePropertyContacts?.map((contact) => (
                          <div key={contact.id} className="flex justify-between items-center">
                            <div>
                              <span className="font-medium text-blue-700">{contact.name}</span>
                              {contact.phone && (
                                <span className="ml-2 text-blue-600 text-sm">({contact.phone})</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-3">
                {duplicateCheck.existingContact ? (
                  <>
                    <button
                      onClick={() => {
                        setDuplicateCheck(prev => ({ ...prev, action: 'update' }))
                        handleSubmit({ preventDefault: () => {} } as React.FormEvent)
                      }}
                      className="w-full btn-primary"
                    >
                      Update Existing Contact
                    </button>
                    <button
                      onClick={() => {
                        setDuplicateCheck(prev => ({ ...prev, action: 'create' }))
                        handleSubmit({ preventDefault: () => {} } as React.FormEvent)
                      }}
                      className="w-full btn-secondary"
                    >
                      Create New Contact Anyway
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setDuplicateCheck(prev => ({ ...prev, action: 'create' }))
                      handleSubmit(new Event('submit') as any)
                    }}
                    className="w-full btn-primary"
                  >
                    Add Contact (Different Name/Details)
                  </button>
                )}
                <button
                  onClick={() => setDuplicateCheck({ show: false, action: 'cancel' })}
                  className="w-full text-gray-500 hover:text-gray-700 py-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
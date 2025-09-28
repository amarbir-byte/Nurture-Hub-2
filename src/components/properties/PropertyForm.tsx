import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { ensureUserExists } from '../../utils/userUtils'
import { geocode } from '../../lib/geocoding'
import { checkDuplicateProperty } from '../../utils/duplicateCheck'
import { AddressAutoCorrect } from '../ui/AddressAutoCorrect'

interface Property {
  id: string
  user_id: string
  address: string
  // NZ Address Components
  street_number?: string
  street?: string
  suburb?: string
  city?: string
  region?: string
  postal_code?: string
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
  organisation?: string
  sale_method?: string
  lat?: number
  lng?: number
  created_at: string
  updated_at: string
}

interface PropertyFormProps {
  property?: Property | null
  onSave: () => void
  onCancel: () => void
}

interface FormData {
  address: string
  // NZ Address Components
  street_number: string
  street: string
  suburb: string
  city: string
  region: string
  postal_code: string
  status: 'listed' | 'sold' | 'withdrawn'
  price: string
  bedrooms: string
  bathrooms: string
  property_type: 'house' | 'apartment' | 'townhouse' | 'land' | 'commercial'
  description: string
  listing_date: string
  sold_date: string
  floor_area: string
  land_area_m2: string
  organisation: string
  showAdvanced: boolean
}

export function PropertyForm({ property, onSave, onCancel }: PropertyFormProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<FormData>>({})
  const [duplicateCheck, setDuplicateCheck] = useState<{
    show: boolean
    existingProperty?: any
    action: 'create' | 'update' | 'cancel'
  }>({ show: false, action: 'create' })

  const [formData, setFormData] = useState<FormData>({
    address: property?.address || '',
    // NZ Address Components
    street_number: property?.street_number || '',
    street: property?.street || '',
    suburb: property?.suburb || '',
    city: property?.city || '',
    region: property?.region || 'Auckland',
    postal_code: property?.postal_code || '',
    status: property?.status || 'listed',
    price: property?.price?.toString() || '',
    bedrooms: property?.bedrooms?.toString() || '',
    bathrooms: property?.bathrooms?.toString() || '',
    property_type: property?.property_type || 'house',
    description: property?.description || '',
    listing_date: property?.listing_date || '',
    sold_date: property?.sold_date || '',
    floor_area: property?.floor_area?.toString() || '',
    land_area_m2: property?.land_area_m2?.toString() || '',
    organisation: property?.organisation || '',
    showAdvanced: false,
  })


  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {}

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required'
    }

    // For sold properties, require price. For listed properties, price is optional
    if (formData.status === 'sold' && !formData.price.trim()) {
      newErrors.price = 'Sale price is required for sold properties'
    }

    if (formData.price && (isNaN(Number(formData.price)) || Number(formData.price) <= 0)) {
      newErrors.price = 'Price must be a valid positive number'
    }


    if (formData.bedrooms && (isNaN(Number(formData.bedrooms)) || Number(formData.bedrooms) < 0)) {
      newErrors.bedrooms = 'Bedrooms must be a valid number'
    }

    if (formData.bathrooms && (isNaN(Number(formData.bathrooms)) || Number(formData.bathrooms) < 0)) {
      newErrors.bathrooms = 'Bathrooms must be a valid number'
    }

    if (formData.status === 'sold' && !formData.sold_date) {
      newErrors.sold_date = 'Sold date is required when status is sold'
    }

    if (formData.status === 'listed' && !formData.listing_date) {
      newErrors.listing_date = 'Listing date is required when status is listed'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    // If this is a new property (not editing), check for duplicates
    if (!property && user) {
      const duplicateResult = await checkDuplicateProperty(user.id, formData.address)
      
      if (duplicateResult.isDuplicate && duplicateResult.existingProperty) {
        setDuplicateCheck({
          show: true,
          existingProperty: duplicateResult.existingProperty,
          action: 'create'
        })
        return
      }
    }

    // Proceed with normal create/update
    await saveProperty()
  }

  const updateExistingProperty = async () => {
    if (!user || !duplicateCheck.existingProperty) return

    setLoading(true)

    try {
      // Build the most accurate address for geocoding using components if available
      let fullAddress = formData.address.trim()

      // If we have address components, build a more precise address
      if (formData.street_number || formData.street || formData.suburb || formData.city) {
        const addressParts = []

        // Street address
        if (formData.street_number && formData.street) {
          addressParts.push(`${formData.street_number} ${formData.street}`)
        } else if (formData.street) {
          addressParts.push(formData.street)
        }

        // Add suburb, city, region, postal code
        if (formData.suburb) addressParts.push(formData.suburb)
        if (formData.city) addressParts.push(formData.city)
        if (formData.region && formData.region !== formData.city) addressParts.push(formData.region)
        if (formData.postal_code) addressParts.push(formData.postal_code)

        if (addressParts.length > 0) {
          fullAddress = addressParts.join(', ')
        }
      }

      // Add New Zealand if not already present
      if (!fullAddress.toLowerCase().includes('new zealand') && !fullAddress.toLowerCase().includes('nz')) {
        fullAddress += ', New Zealand'
      }

      console.log('Geocoding full property address:', fullAddress)
      const coordinates = await geocode(fullAddress)

      const propertyData = {
        address: formData.address.trim(),
        // NZ Address Components
        street_number: formData.street_number.trim() || null,
        street: formData.street.trim() || null,
        suburb: formData.suburb.trim() || null,
        city: formData.city.trim() || null,
        region: formData.region.trim() || null,
        postal_code: formData.postal_code.trim() || null,
        status: formData.status,
        price: formData.price ? Number(formData.price) : null,
        sale_price: formData.status === 'sold' && formData.price ? Number(formData.price) : null,
        bedrooms: formData.bedrooms ? Number(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? Number(formData.bathrooms) : null,
        property_type: formData.property_type,
        description: formData.description.trim() || null,
        listing_date: formData.listing_date || null,
        sold_date: formData.sold_date || null,
        floor_area: formData.floor_area ? Number(formData.floor_area) : null,
        land_area_m2: formData.land_area_m2 ? Number(formData.land_area_m2) : null,
        organisation: formData.organisation.trim() || null,
        lat: coordinates.lat,
        lng: coordinates.lng,
        updated_at: new Date().toISOString(),
      }

      const result = await supabase
        .from('properties')
        .update(propertyData)
        .eq('id', duplicateCheck.existingProperty.id)
        .eq('user_id', user.id)

      if (result.error) throw result.error

      onSave()
    } catch (error) {
      console.error('Error updating existing property:', error)
      alert('Error updating property. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const saveProperty = async () => {
    setLoading(true)

    try {
      // Ensure user exists in users table before creating property
      if (user) {
        await ensureUserExists(user)
      }

      // Build the most accurate address for geocoding using components if available
      let fullAddress = formData.address.trim()

      // If we have address components, build a more precise address
      if (formData.street_number || formData.street || formData.suburb || formData.city) {
        const addressParts = []

        // Street address
        if (formData.street_number && formData.street) {
          addressParts.push(`${formData.street_number} ${formData.street}`)
        } else if (formData.street) {
          addressParts.push(formData.street)
        }

        // Add suburb, city, region, postal code
        if (formData.suburb) addressParts.push(formData.suburb)
        if (formData.city) addressParts.push(formData.city)
        if (formData.region && formData.region !== formData.city) addressParts.push(formData.region)
        if (formData.postal_code) addressParts.push(formData.postal_code)

        if (addressParts.length > 0) {
          fullAddress = addressParts.join(', ')
        }
      }

      // Add New Zealand if not already present
      if (!fullAddress.toLowerCase().includes('new zealand') && !fullAddress.toLowerCase().includes('nz')) {
        fullAddress += ', New Zealand'
      }

      console.log('Geocoding full property address:', fullAddress)
      const coordinates = await geocode(fullAddress)

      const propertyData = {
        address: formData.address.trim(),
        // NZ Address Components
        street_number: formData.street_number.trim() || null,
        street: formData.street.trim() || null,
        suburb: formData.suburb.trim() || null,
        city: formData.city.trim() || null,
        region: formData.region.trim() || null,
        postal_code: formData.postal_code.trim() || null,
        status: formData.status,
        price: formData.price ? Number(formData.price) : null,
        sale_price: formData.status === 'sold' && formData.price ? Number(formData.price) : null,
        bedrooms: formData.bedrooms ? Number(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? Number(formData.bathrooms) : null,
        property_type: formData.property_type,
        description: formData.description.trim() || null,
        listing_date: formData.listing_date || null,
        sold_date: formData.sold_date || null,
        floor_area: formData.floor_area ? Number(formData.floor_area) : null,
        land_area_m2: formData.land_area_m2 ? Number(formData.land_area_m2) : null,
        organisation: formData.organisation.trim() || null,
        lat: coordinates.lat,
        lng: coordinates.lng,
        user_id: user?.id,
        updated_at: new Date().toISOString(),
      }

      let result
      if (property) {
        // Update existing property
        result = await supabase
          .from('properties')
          .update(propertyData)
          .eq('id', property.id)
          .eq('user_id', user?.id)
      } else {
        // Create new property
        result = await supabase
          .from('properties')
          .insert([{ ...propertyData, created_at: new Date().toISOString() }])
      }

      if (result.error) throw result.error

      onSave()
    } catch (error) {
      console.error('Error saving property:', error)
      alert('Error saving property. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field as keyof Partial<FormData>]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleAddressSelect = (suggestion: any) => {
    // Auto-populate address components when address is selected/corrected
    const { address_components } = suggestion
    
    setFormData(prev => ({
      ...prev,
      address: suggestion.formatted_address,
      street_number: address_components.street_number || prev.street_number,
      street: address_components.street || prev.street,
      suburb: address_components.suburb || prev.suburb,
      city: address_components.city || prev.city,
      region: address_components.region || prev.region,
      postal_code: address_components.postal_code || prev.postal_code,
    }))
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {property ? 'Edit Property' : 'Add New Property'}
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
            {/* Address */}
            <div>
              <AddressAutoCorrect
                value={formData.address}
                onChange={(value) => handleInputChange('address', value)}
                onAddressSelect={handleAddressSelect}
                placeholder="e.g. 123 Main Street, Ponsonby, Auckland"
                error={errors.address}
                label="Complete Address"
                required
              />
            </div>

            {/* Address Components (auto-populated from selection) */}
            {(formData.street_number || formData.street || formData.suburb || formData.city || formData.postal_code) && (
              <div className="space-y-4 bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-blue-900">Address Components</h3>
                  <p className="text-xs text-blue-700">Auto-filled from selected address</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="street_number" className="block text-xs font-medium text-blue-700 mb-1">
                      Street Number
                    </label>
                    <input
                      type="text"
                      id="street_number"
                      value={formData.street_number}
                      onChange={(e) => handleInputChange('street_number', e.target.value)}
                      className="input-field text-sm"
                      placeholder="123"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="street" className="block text-xs font-medium text-blue-700 mb-1">
                      Street Name
                    </label>
                    <input
                      type="text"
                      id="street"
                      value={formData.street}
                      onChange={(e) => handleInputChange('street', e.target.value)}
                      className="input-field text-sm"
                      placeholder="Main Street"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label htmlFor="suburb" className="block text-xs font-medium text-blue-700 mb-1">
                      Suburb
                    </label>
                    <input
                      type="text"
                      id="suburb"
                      value={formData.suburb}
                      onChange={(e) => handleInputChange('suburb', e.target.value)}
                      className="input-field text-sm"
                      placeholder="Ponsonby"
                    />
                  </div>

                  <div>
                    <label htmlFor="city" className="block text-xs font-medium text-blue-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="input-field text-sm"
                      placeholder="Auckland"
                    />
                  </div>

                  <div>
                    <label htmlFor="region" className="block text-xs font-medium text-blue-700 mb-1">
                      Region
                    </label>
                    <input
                      type="text"
                      id="region"
                      value={formData.region}
                      onChange={(e) => handleInputChange('region', e.target.value)}
                      className="input-field text-sm"
                      placeholder="Auckland"
                    />
                  </div>

                  <div>
                    <label htmlFor="postal_code" className="block text-xs font-medium text-blue-700 mb-1">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      id="postal_code"
                      value={formData.postal_code}
                      onChange={(e) => handleInputChange('postal_code', e.target.value)}
                      className="input-field text-sm"
                      placeholder="1011"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Property Type & Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="property_type" className="block text-sm font-medium text-gray-700 mb-1">
                  Property Type
                </label>
                <select
                  id="property_type"
                  value={formData.property_type}
                  onChange={(e) => handleInputChange('property_type', e.target.value)}
                  className="input-field"
                >
                  <option value="house">House</option>
                  <option value="apartment">Apartment</option>
                  <option value="townhouse">Townhouse</option>
                  <option value="land">Land</option>
                  <option value="commercial">Commercial</option>
                </select>
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="input-field"
                >
                  <option value="listed">Listed</option>
                  <option value="sold">Sold</option>
                  <option value="withdrawn">Withdrawn</option>
                </select>
              </div>
            </div>

            {/* Price Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Pricing</h3>
                <p className="text-sm text-gray-500">
                  {formData.status === 'sold' ? '* Sale price required for sold properties' : 'Price is optional for listed properties'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.status === 'listed' ? 'List Price (NZD)' : 'Sale Price (NZD)'} {formData.status === 'sold' ? '*' : ''}
                  </label>
                  <input
                    type="number"
                    id="price"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    className={`input-field ${errors.price ? 'border-red-500' : ''}`}
                    placeholder={formData.status === 'listed' ? '650000' : '675000'}
                    min="0"
                    step="1000"
                    required={formData.status === 'sold'}
                  />
                  {errors.price && (
                    <p className="mt-1 text-sm text-red-600">{errors.price}</p>
                  )}
                </div>

              </div>
            </div>

            {/* Bedrooms & Bathrooms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="bedrooms" className="block text-sm font-medium text-gray-700 mb-1">
                  Bedrooms
                </label>
                <input
                  type="number"
                  id="bedrooms"
                  value={formData.bedrooms}
                  onChange={(e) => handleInputChange('bedrooms', e.target.value)}
                  className={`input-field ${errors.bedrooms ? 'border-red-500' : ''}`}
                  placeholder="3"
                  min="0"
                  max="20"
                />
                {errors.bedrooms && (
                  <p className="mt-1 text-sm text-red-600">{errors.bedrooms}</p>
                )}
              </div>

              <div>
                <label htmlFor="bathrooms" className="block text-sm font-medium text-gray-700 mb-1">
                  Bathrooms
                </label>
                <input
                  type="number"
                  id="bathrooms"
                  value={formData.bathrooms}
                  onChange={(e) => handleInputChange('bathrooms', e.target.value)}
                  className={`input-field ${errors.bathrooms ? 'border-red-500' : ''}`}
                  placeholder="2"
                  min="0"
                  max="20"
                  step="0.5"
                />
                {errors.bathrooms && (
                  <p className="mt-1 text-sm text-red-600">{errors.bathrooms}</p>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="listing_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Listing Date {formData.status === 'listed' && '*'}
                </label>
                <input
                  type="date"
                  id="listing_date"
                  value={formData.listing_date}
                  onChange={(e) => handleInputChange('listing_date', e.target.value)}
                  className={`input-field ${errors.listing_date ? 'border-red-500' : ''}`}
                />
                {errors.listing_date && (
                  <p className="mt-1 text-sm text-red-600">{errors.listing_date}</p>
                )}
              </div>

              {formData.status === 'sold' && (
                <div>
                  <label htmlFor="sold_date" className="block text-sm font-medium text-gray-700 mb-1">
                    Sold Date *
                  </label>
                  <input
                    type="date"
                    id="sold_date"
                    value={formData.sold_date}
                    onChange={(e) => handleInputChange('sold_date', e.target.value)}
                    className={`input-field ${errors.sold_date ? 'border-red-500' : ''}`}
                  />
                  {errors.sold_date && (
                    <p className="mt-1 text-sm text-red-600">{errors.sold_date}</p>
                  )}
                </div>
              )}
            </div>

            {/* Advanced Fields Toggle */}
            <div className="border-t border-gray-200 pt-6">
              <button
                type="button"
                onClick={() => handleInputChange('showAdvanced', !formData.showAdvanced)}
                className="flex items-center text-sm font-medium text-primary-600 hover:text-primary-500"
              >
                <span>{formData.showAdvanced ? 'Hide' : 'Show'} Additional Details</span>
                <svg
                  className={`ml-2 h-4 w-4 transform transition-transform ${
                    formData.showAdvanced ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Advanced Fields */}
            {formData.showAdvanced && (
              <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                {/* Property Measurements */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="floor_area" className="block text-sm font-medium text-gray-700 mb-1">
                      Floor Area (m²)
                    </label>
                    <input
                      type="number"
                      id="floor_area"
                      value={formData.floor_area}
                      onChange={(e) => handleInputChange('floor_area', e.target.value)}
                      className="input-field"
                      placeholder="120"
                      min="0"
                      step="1"
                    />
                  </div>

                  <div>
                    <label htmlFor="land_area_m2" className="block text-sm font-medium text-gray-700 mb-1">
                      Land Area (m²)
                    </label>
                    <input
                      type="number"
                      id="land_area_m2"
                      value={formData.land_area_m2}
                      onChange={(e) => handleInputChange('land_area_m2', e.target.value)}
                      className="input-field"
                      placeholder="600"
                      min="0"
                      step="1"
                    />
                  </div>
                </div>

                {/* Organisation */}
                <div>
                  <label htmlFor="organisation" className="block text-sm font-medium text-gray-700 mb-1">
                    Real Estate Agency
                  </label>
                  <input
                    type="text"
                    id="organisation"
                    value={formData.organisation}
                    onChange={(e) => handleInputChange('organisation', e.target.value)}
                    className="input-field"
                    placeholder="Barfoot & Thompson, Ray White, etc."
                  />
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="input-field"
                rows={3}
                placeholder="Property description, features, etc..."
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
                  property ? 'Update Property' : 'Add Property'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Duplicate Property Modal */}
      {duplicateCheck.show && duplicateCheck.existingProperty && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-60">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Duplicate Property Found</h3>
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
                <p className="text-gray-600 mb-4">
                  A property with a similar address already exists in your database:
                </p>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium text-gray-700">Address:</span>
                      <span className="ml-2 text-gray-600">{duplicateCheck.existingProperty.address}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Status:</span>
                      <span className="ml-2 text-gray-600 capitalize">{duplicateCheck.existingProperty.status}</span>
                    </div>
                    {duplicateCheck.existingProperty.price && (
                      <div>
                        <span className="font-medium text-gray-700">Price:</span>
                        <span className="ml-2 text-gray-600">${duplicateCheck.existingProperty.price.toLocaleString()}</span>
                      </div>
                    )}
                    {duplicateCheck.existingProperty.bedrooms && (
                      <div>
                        <span className="font-medium text-gray-700">Bedrooms:</span>
                        <span className="ml-2 text-gray-600">{duplicateCheck.existingProperty.bedrooms}</span>
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-gray-700">Added:</span>
                      <span className="ml-2 text-gray-600">
                        {new Date(duplicateCheck.existingProperty.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={async () => {
                    setDuplicateCheck(prev => ({ ...prev, action: 'update', show: false }))
                    await updateExistingProperty()
                  }}
                  className="w-full btn-primary"
                >
                  Update Existing Property
                </button>
                <button
                  onClick={async () => {
                    setDuplicateCheck(prev => ({ ...prev, action: 'create', show: false }))
                    await saveProperty()
                  }}
                  className="w-full btn-secondary"
                >
                  Create New Property Anyway
                </button>
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
import { useState } from 'react'
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
  status: 'listed' | 'sold' | 'withdrawn'
  price: string
  bedrooms: string
  bathrooms: string
  property_type: 'house' | 'apartment' | 'townhouse' | 'land' | 'commercial'
  description: string
  listing_date: string
  sold_date: string
}

export function PropertyForm({ property, onSave, onCancel }: PropertyFormProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<FormData>>({})

  const [formData, setFormData] = useState<FormData>({
    address: property?.address || '',
    status: property?.status || 'listed',
    price: property?.price?.toString() || '',
    bedrooms: property?.bedrooms?.toString() || '',
    bathrooms: property?.bathrooms?.toString() || '',
    property_type: property?.property_type || 'house',
    description: property?.description || '',
    listing_date: property?.listing_date || '',
    sold_date: property?.sold_date || '',
  })

  const mockGeocode = async (_address: string) => {
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

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required'
    }

    if (!formData.price.trim()) {
      newErrors.price = 'Price is required'
    } else if (isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
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

    setLoading(true)

    try {
      const coordinates = await mockGeocode(formData.address)

      const propertyData = {
        address: formData.address.trim(),
        status: formData.status,
        price: Number(formData.price),
        bedrooms: formData.bedrooms ? Number(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? Number(formData.bathrooms) : null,
        property_type: formData.property_type,
        description: formData.description.trim() || null,
        listing_date: formData.listing_date || null,
        sold_date: formData.sold_date || null,
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
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                Address *
              </label>
              <input
                type="text"
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className={`input-field ${errors.address ? 'border-red-500' : ''}`}
                placeholder="123 Main Street, Auckland"
              />
              {errors.address && (
                <p className="mt-1 text-sm text-red-600">{errors.address}</p>
              )}
            </div>

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

            {/* Price */}
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                Price (NZD) *
              </label>
              <input
                type="number"
                id="price"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                className={`input-field ${errors.price ? 'border-red-500' : ''}`}
                placeholder="650000"
                min="0"
                step="1000"
              />
              {errors.price && (
                <p className="mt-1 text-sm text-red-600">{errors.price}</p>
              )}
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
    </div>
  )
}
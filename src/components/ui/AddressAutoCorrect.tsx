import { useState, useEffect, useRef } from 'react'
import { geocode } from '../../lib/geocoding'
import { parseNZAddress } from '../../types/address'

interface AddressSuggestion {
  formatted_address: string
  address_components: {
    street_number?: string
    street?: string
    suburb?: string
    city?: string
    region?: string
    postal_code?: string
  }
  confidence: number
  lat?: number
  lng?: number
}

interface AddressAutoCorrectProps {
  value: string
  onChange: (value: string) => void
  onAddressSelect?: (suggestion: AddressSuggestion) => void
  placeholder?: string
  className?: string
  error?: string
  label?: string
  required?: boolean
}

export function AddressAutoCorrect({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Start typing an address...",
  className = "",
  error,
  label,
  required = false,
}: AddressAutoCorrectProps) {
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<AddressSuggestion | null>(null)
  const [showCorrection, setShowCorrection] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Debounced address validation
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (value.trim().length > 5) {
      debounceRef.current = setTimeout(async () => {
        await validateAddress(value)
      }, 1000)
    } else {
      setValidationResult(null)
      setShowCorrection(false)
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [value])

  const validateAddress = async (address: string) => {
    if (!address.trim()) return

    setIsValidating(true)
    try {
      // Try to geocode the address
      const result = await geocode(address)
      
      if (result.lat && result.lng) {
        // Address was successfully geocoded, parse it for components
        const addressComponents = parseNZAddress(address)
        
        // Get the formatted address from the geocoding result
        const formattedAddress = result.formatted_address || address
        
        const suggestion: AddressSuggestion = {
          formatted_address: formattedAddress,
          address_components: addressComponents,
          confidence: 0.8, // High confidence since it geocoded successfully
          lat: result.lat,
          lng: result.lng
        }

        setValidationResult(suggestion)
        
        // Check if the address needs correction (compare original with formatted)
        const needsCorrection = checkIfNeedsCorrection(address, formattedAddress)
        setShowCorrection(needsCorrection)
      } else {
        setValidationResult(null)
        setShowCorrection(false)
      }
    } catch (error) {
      console.error('Address validation error:', error)
      setValidationResult(null)
      setShowCorrection(false)
    } finally {
      setIsValidating(false)
    }
  }

  const checkIfNeedsCorrection = (originalAddress: string, formattedAddress: string): boolean => {
    // If the formatted address is different from the original, it needs correction
    if (originalAddress.toLowerCase().trim() !== formattedAddress.toLowerCase().trim()) {
      return true
    }
    
    // Check for common typos or incomplete addresses
    const commonTypos = ['st', 'rd', 'ave', 'dr', 'ct', 'pl']
    const hasAbbreviations = commonTypos.some(abbr => 
      originalAddress.toLowerCase().includes(abbr) && 
      !originalAddress.toLowerCase().includes(abbr + '.')
    )
    
    return hasAbbreviations
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
  }

  const handleAcceptCorrection = () => {
    if (validationResult) {
      // Use the formatted address directly from the geocoding result
      const correctedAddress = validationResult.formatted_address
      onChange(correctedAddress)
      setShowCorrection(false)
      if (onAddressSelect) {
        onAddressSelect(validationResult)
      }
    }
  }

  const buildCorrectedAddress = (suggestion: AddressSuggestion): string => {
    const { address_components } = suggestion
    const parts = []
    
    if (address_components.street_number && address_components.street) {
      parts.push(`${address_components.street_number} ${address_components.street}`)
    }
    if (address_components.suburb) {
      parts.push(address_components.suburb)
    }
    if (address_components.city) {
      parts.push(address_components.city)
    }
    if (address_components.postal_code) {
      parts.push(address_components.postal_code)
    }
    
    return parts.join(', ')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowCorrection(false)
    }
  }

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          id="address"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className={`input-field pr-10 ${error ? 'border-red-500' : ''} ${isValidating ? 'bg-blue-50' : ''}`}
          placeholder={placeholder}
          required={required}
        />
        
        {/* Validation indicator */}
        {isValidating && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
        
        {!isValidating && validationResult && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      {/* Address correction suggestion */}
      {showCorrection && validationResult && (
        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800">
                Address Auto-Correction Available
              </h3>
              <div className="mt-1 text-sm text-yellow-700">
                <p className="mb-2">We found a more complete address:</p>
                <div className="bg-white p-2 rounded border text-gray-900 font-mono text-xs">
                  {validationResult.formatted_address}
                </div>
              </div>
              <div className="mt-3 flex space-x-2">
                <button
                  type="button"
                  onClick={handleAcceptCorrection}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  Accept Correction
                </button>
                <button
                  type="button"
                  onClick={() => setShowCorrection(false)}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Keep Original
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

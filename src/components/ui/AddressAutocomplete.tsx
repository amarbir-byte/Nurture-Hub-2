import { useState, useEffect, useRef } from 'react'
import { autocompleteAddress, type AutocompleteResult } from '../../lib/maptiler'

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect?: (result: AutocompleteResult) => void
  placeholder?: string
  className?: string
  error?: string
  label?: string
  required?: boolean
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Start typing an address...",
  className = "",
  error,
  label,
  required = false
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AutocompleteResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(-1)

  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([])
  const debounceTimeout = useRef<NodeJS.Timeout | undefined>(undefined)

  // Debounced autocomplete search
  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current)
    }

    if (value.trim().length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    debounceTimeout.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const results = await autocompleteAddress(value)
        setSuggestions(results)
        setShowSuggestions(results.length > 0)
        setActiveSuggestion(-1)
      } catch (error) {
        console.error('Address autocomplete error:', error)
        setSuggestions([])
        setShowSuggestions(false)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current)
      }
    }
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    setActiveSuggestion(-1)
  }

  const handleSuggestionClick = (suggestion: AutocompleteResult) => {
    onChange(suggestion.place_name)
    setSuggestions([])
    setShowSuggestions(false)
    setActiveSuggestion(-1)
    onSelect?.(suggestion)
    inputRef.current?.blur()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveSuggestion(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break

      case 'ArrowUp':
        e.preventDefault()
        setActiveSuggestion(prev => prev > 0 ? prev - 1 : -1)
        break

      case 'Enter':
        e.preventDefault()
        if (activeSuggestion >= 0 && activeSuggestion < suggestions.length) {
          handleSuggestionClick(suggestions[activeSuggestion])
        }
        break

      case 'Escape':
        setShowSuggestions(false)
        setActiveSuggestion(-1)
        inputRef.current?.blur()
        break
    }
  }

  const handleBlur = () => {
    // Delay hiding suggestions to allow click events on suggestions
    setTimeout(() => {
      setShowSuggestions(false)
      setActiveSuggestion(-1)
    }, 150)
  }

  const handleFocus = () => {
    if (suggestions.length > 0 && value.trim().length >= 3) {
      setShowSuggestions(true)
    }
  }

  // Scroll active suggestion into view
  useEffect(() => {
    if (activeSuggestion >= 0 && suggestionRefs.current[activeSuggestion]) {
      suggestionRefs.current[activeSuggestion]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      })
    }
  }, [activeSuggestion])

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          className={`
            input-field pr-10
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
            ${className}
          `}
          autoComplete="off"
        />

        {/* Loading spinner */}
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-primary-600"></div>
          </div>
        )}

        {/* Address icon */}
        {!isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.place_name}-${index}`}
              ref={el => { suggestionRefs.current[index] = el }}
              className={`
                px-4 py-2 cursor-pointer text-sm
                ${index === activeSuggestion
                  ? 'bg-primary-50 text-primary-900'
                  : 'text-gray-900 hover:bg-gray-50'
                }
                ${index !== suggestions.length - 1 ? 'border-b border-gray-100' : ''}
              `}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="flex items-center">
                <svg className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {suggestion.place_name}
                  </div>
                  {suggestion.place_type.length > 0 && (
                    <div className="text-xs text-gray-500 capitalize">
                      {suggestion.place_type[0]}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-400 ml-2">
                  {Math.round(suggestion.relevance * 100)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* Helper text */}
      {!error && value.trim().length > 0 && value.trim().length < 3 && (
        <p className="mt-1 text-sm text-gray-500">
          Type at least 3 characters to see address suggestions
        </p>
      )}
    </div>
  )
}
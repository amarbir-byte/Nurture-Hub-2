import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

type SortOption = 'name_asc' | 'name_desc' | 'temperature_asc' | 'temperature_desc' | 'created_desc' | 'created_asc' | 'updated_desc' | 'updated_asc'

interface FilterSortDropdownProps {
  sortBy: SortOption
  onSortChange: (sort: SortOption) => void
  followUpFilter: 'all' | 'due' | 'overdue'
  onFollowUpFilterChange: (filter: 'all' | 'due' | 'overdue') => void
  communicationFilter: 'all' | 'contacted' | 'not_contacted'
  onCommunicationFilterChange: (filter: 'all' | 'contacted' | 'not_contacted') => void
  contactTypeFilter: 'all' | 'buyer' | 'seller' | 'both'
  onContactTypeFilterChange: (filter: 'all' | 'buyer' | 'seller' | 'both') => void
  temperatureFilter: 'all' | 'hot' | 'warm' | 'cold'
  onTemperatureFilterChange: (filter: 'all' | 'hot' | 'warm' | 'cold') => void
}

const sortOptions = [
  { value: 'created_desc' as SortOption, label: 'Newest First', icon: '🕒', category: 'Sort by Date' },
  { value: 'created_asc' as SortOption, label: 'Oldest First', icon: '🕐', category: 'Sort by Date' },
  { value: 'updated_desc' as SortOption, label: 'Recently Modified', icon: '📝', category: 'Sort by Date' },
  { value: 'updated_asc' as SortOption, label: 'Least Modified', icon: '📄', category: 'Sort by Date' },
  { value: 'name_asc' as SortOption, label: 'Name A-Z', icon: '🔤', category: 'Sort by Name' },
  { value: 'name_desc' as SortOption, label: 'Name Z-A', icon: '🔤', category: 'Sort by Name' },
  { value: 'temperature_asc' as SortOption, label: 'Cool to Hot', icon: '🌡️', category: 'Sort by Temperature' },
  { value: 'temperature_desc' as SortOption, label: 'Hot to Cool', icon: '🌡️', category: 'Sort by Temperature' },
]

const followUpOptions = [
  { value: 'all', label: 'All Follow-ups', icon: '📅' },
  { value: 'due', label: 'Due Today', icon: '⏰' },
  { value: 'overdue', label: 'Overdue', icon: '🚨' },
]

const communicationOptions = [
  { value: 'all', label: 'All Contacts', icon: '👥' },
  { value: 'contacted', label: 'Contacted', icon: '💬' },
  { value: 'not_contacted', label: 'Not Contacted', icon: '📝' },
]

const contactTypeOptions = [
  { value: 'all', label: 'All Types', icon: '👥' },
  { value: 'buyer', label: '👤 Buyers', icon: '🏠' },
  { value: 'seller', label: '🏠 Sellers', icon: '💼' },
  { value: 'both', label: '🔄 Both', icon: '🔄' },
]

const temperatureOptions = [
  { value: 'all', label: 'All Temperatures', icon: '🌡️' },
  { value: 'hot', label: '🔥 Hot', icon: '🔥' },
  { value: 'warm', label: '🟡 Warm', icon: '🟡' },
  { value: 'cold', label: '🔵 Cold', icon: '🔵' },
]

export function FilterSortDropdown({
  sortBy,
  onSortChange,
  followUpFilter,
  onFollowUpFilterChange,
  communicationFilter,
  onCommunicationFilterChange,
  contactTypeFilter,
  onContactTypeFilterChange,
  temperatureFilter,
  onTemperatureFilterChange
}: FilterSortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)

  const selectedOption = sortOptions.find(option => option.value === sortBy)

  const groupedSortOptions = sortOptions.reduce((acc, option) => {
    if (!acc[option.category]) {
      acc[option.category] = []
    }
    acc[option.category].push(option)
    return acc
  }, {} as Record<string, typeof sortOptions>)

  const handleSortSelect = (option: SortOption) => {
    onSortChange(option)
    setIsOpen(false)
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (followUpFilter !== 'all') count++
    if (communicationFilter !== 'all') count++
    if (contactTypeFilter !== 'all') count++
    if (temperatureFilter !== 'all') count++
    return count
  }

  const activeFiltersCount = getActiveFiltersCount()

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const dropdownWidth = Math.min(384, viewportWidth - 32) // 384px = w-96, with 16px padding on each side
      const dropdownHeight = Math.min(window.innerHeight * 0.8, 600) // Max 80vh or 600px

      // Calculate horizontal position
      let left = rect.right - dropdownWidth + window.scrollX

      // Ensure dropdown doesn't go off the left edge
      if (left < 16) {
        left = 16
      }

      // For mobile, center the dropdown
      if (viewportWidth < 640) { // sm breakpoint
        left = (viewportWidth - dropdownWidth) / 2
      }

      // Calculate vertical position
      let top = rect.bottom + window.scrollY + 8

      // Check if dropdown would go off bottom of screen
      if (top + dropdownHeight > viewportHeight + window.scrollY) {
        // Position above the button instead
        top = rect.top + window.scrollY - dropdownHeight - 8
      }

      setDropdownPosition({
        top,
        left,
        width: dropdownWidth
      })
    }
  }, [isOpen])

  const handleToggle = () => {
    setIsOpen(!isOpen)
  }

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (isOpen) {
        // Recalculate position on resize
        const event = new Event('resize')
        handleToggle()
        setTimeout(() => handleToggle(), 0)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isOpen])

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors relative"
      >
        <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
        <span className="hidden sm:inline">Filter & Sort</span>
        <span className="sm:hidden">Filter</span>
        {activeFiltersCount > 0 && (
          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
            {activeFiltersCount}
          </span>
        )}
        <svg
          className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[99998]"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div
            className="fixed z-[99999] bg-white border border-gray-200 rounded-lg shadow-xl max-h-[80vh] overflow-y-auto"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
            }}
          >
            <div className="p-3 sm:p-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3 sm:mb-4">
                Filter & Sort Contacts
              </div>

              {/* Filter Sections */}
              <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                {/* Follow-up Filter */}
                <div>
                  <div className="text-xs font-medium text-gray-700 mb-2">Follow-up Status</div>
                  <div className="space-y-1">
                    {followUpOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => onFollowUpFilterChange(option.value as any)}
                        className={`w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                          followUpFilter === option.value
                            ? 'bg-primary-50 text-primary-700 border border-primary-200'
                            : 'text-gray-700 hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        <span className="text-base mr-3">{option.icon}</span>
                        <span className="flex-1 text-left">{option.label}</span>
                        {followUpFilter === option.value && (
                          <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Communication Filter */}
                <div>
                  <div className="text-xs font-medium text-gray-700 mb-2">Communication Status</div>
                  <div className="space-y-1">
                    {communicationOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => onCommunicationFilterChange(option.value as any)}
                        className={`w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                          communicationFilter === option.value
                            ? 'bg-primary-50 text-primary-700 border border-primary-200'
                            : 'text-gray-700 hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        <span className="text-base mr-3">{option.icon}</span>
                        <span className="flex-1 text-left">{option.label}</span>
                        {communicationFilter === option.value && (
                          <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contact Type Filter */}
                <div>
                  <div className="text-xs font-medium text-gray-700 mb-2">Contact Type</div>
                  <div className="space-y-1">
                    {contactTypeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => onContactTypeFilterChange(option.value as any)}
                        className={`w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                          contactTypeFilter === option.value
                            ? 'bg-primary-50 text-primary-700 border border-primary-200'
                            : 'text-gray-700 hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        <span className="text-base mr-3">{option.icon}</span>
                        <span className="flex-1 text-left">{option.label}</span>
                        {contactTypeFilter === option.value && (
                          <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Temperature Filter */}
                <div>
                  <div className="text-xs font-medium text-gray-700 mb-2">Temperature</div>
                  <div className="space-y-1">
                    {temperatureOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => onTemperatureFilterChange(option.value as any)}
                        className={`w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                          temperatureFilter === option.value
                            ? 'bg-primary-50 text-primary-700 border border-primary-200'
                            : 'text-gray-700 hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        <span className="text-base mr-3">{option.icon}</span>
                        <span className="flex-1 text-left">{option.label}</span>
                        {temperatureFilter === option.value && (
                          <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sort Section */}
              <div className="border-t border-gray-200 pt-3 sm:pt-4">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 sm:mb-3">
                  Sort Options
                </div>
                {Object.entries(groupedSortOptions).map(([category, options]) => (
                  <div key={category} className="mb-3 last:mb-0">
                    <div className="text-xs font-medium text-gray-700 mb-2">
                      {category}
                    </div>
                    <div className="space-y-1">
                      {options.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleSortSelect(option.value)}
                          className={`w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                            sortBy === option.value
                              ? 'bg-primary-50 text-primary-700 border border-primary-200'
                              : 'text-gray-700 hover:bg-gray-50 border border-transparent'
                          }`}
                        >
                          <span className="text-base mr-3">{option.icon}</span>
                          <span className="flex-1 text-left">{option.label}</span>
                          {sortBy === option.value && (
                            <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
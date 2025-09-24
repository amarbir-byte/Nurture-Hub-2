import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { PropertyCard } from './PropertyCard'
import { PropertyForm } from './PropertyForm'
import { PropertyImport } from './PropertyImport'
import { PropertyDetailsModal } from './PropertyDetailsModal'
import { Pagination } from '../common/Pagination'

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
  organisation?: string
  sale_method?: string
  lat?: number
  lng?: number
  created_at: string
  updated_at: string
}

export function PropertiesPage() {
  const { user } = useAuth()
  const [properties, setProperties] = useState<Property[]>([])
  const [propertiesCommunications, setPropertiesCommunications] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editingProperty, setEditingProperty] = useState<Property | null>(null)
  const [viewingProperty, setViewingProperty] = useState<Property | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'listed' | 'sold' | 'withdrawn'>('all')
  const [communicationFilter, setCommunicationFilter] = useState<'all' | 'contacted' | 'not_contacted'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(12)

  useEffect(() => {
    if (user) {
      fetchProperties()
    }
  }, [user])

  const fetchProperties = async () => {
    try {
      // Fetch properties
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (propertiesError) throw propertiesError

      // Try to fetch communication counts for each property
      // If communication_history table doesn't exist, continue without communication data
      let communicationsCount: Record<string, number> = {}
      try {
        const { data: communicationsData, error: communicationsError } = await supabase
          .from('communication_history')
          .select('property_id')
          .eq('user_id', user?.id)
          .not('property_id', 'is', null)

        if (communicationsError && communicationsError.code === 'PGRST205') {
          // Table doesn't exist - continue without communication data
          console.warn('Communication history table not found. Communication tracking features will be limited.')
        } else if (communicationsError) {
          throw communicationsError
        } else {
          // Count communications per property
          communicationsData?.forEach(comm => {
            if (comm.property_id) {
              communicationsCount[comm.property_id] = (communicationsCount[comm.property_id] || 0) + 1
            }
          })
        }
      } catch (commError) {
        console.warn('Could not fetch communication history:', commError)
        // Continue without communication data
      }

      setProperties(propertiesData || [])
      setPropertiesCommunications(communicationsCount)
    } catch (error) {
      console.error('Error fetching properties:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePropertySaved = () => {
    fetchProperties()
    setShowForm(false)
    setEditingProperty(null)
  }

  const handleEditProperty = (property: Property) => {
    setEditingProperty(property)
    setShowForm(true)
  }

  const handleDeleteProperty = async (propertyId: string) => {
    if (!confirm('Are you sure you want to delete this property?')) return

    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId)
        .eq('user_id', user?.id)

      if (error) throw error
      setProperties(prev => prev.filter(p => p.id !== propertyId))
    } catch (error) {
      console.error('Error deleting property:', error)
      alert('Error deleting property. Please try again.')
    }
  }

  const handleImportComplete = (importedCount: number) => {
    alert(`Successfully imported ${importedCount} properties!`)
    fetchProperties() // Refresh the list
    setShowImport(false)
  }

  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.address.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || property.status === statusFilter
    const communicationCount = propertiesCommunications[property.id] || 0
    const matchesCommunication =
      communicationFilter === 'all' ||
      (communicationFilter === 'contacted' && communicationCount > 0) ||
      (communicationFilter === 'not_contacted' && communicationCount === 0)

    return matchesSearch && matchesStatus && matchesCommunication
  })

  // Pagination logic
  const totalPages = Math.ceil(filteredProperties.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedProperties = filteredProperties.slice(startIndex, endIndex)

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, communicationFilter])

  const stats = {
    total: properties.length,
    listed: properties.filter(p => p.status === 'listed').length,
    sold: properties.filter(p => p.status === 'sold').length,
    withdrawn: properties.filter(p => p.status === 'withdrawn').length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600">Loading properties...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <p className="text-gray-600">Manage your property listings and sales</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Property
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="btn-secondary bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            Import CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="card-stats">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-primary-900 dark:text-white mb-1">{stats.total}</div>
          <div className="text-sm font-medium text-primary-600 dark:text-primary-400">Total Properties</div>
        </div>
        <div className="card-stats">
          <div className="w-12 h-12 bg-gradient-to-br from-success-500 to-success-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-success-600 dark:text-success-400 mb-1">{stats.listed}</div>
          <div className="text-sm font-medium text-primary-600 dark:text-primary-400">Listed</div>
        </div>
        <div className="card-stats">
          <div className="w-12 h-12 bg-gradient-to-br from-accent-500 to-accent-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-accent-600 dark:text-accent-400 mb-1">{stats.sold}</div>
          <div className="text-sm font-medium text-primary-600 dark:text-primary-400">Sold</div>
        </div>
        <div className="card-stats">
          <div className="w-12 h-12 bg-gradient-to-br from-warning-500 to-warning-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-warning-600 dark:text-warning-400 mb-1">{stats.withdrawn}</div>
          <div className="text-sm font-medium text-primary-600 dark:text-primary-400">Withdrawn</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="search" className="sr-only">Search properties</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                id="search"
                type="text"
                placeholder="Search by address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div>
            <label htmlFor="status-filter" className="sr-only">Filter by status</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="input-field"
            >
              <option value="all">All Status</option>
              <option value="listed">Listed</option>
              <option value="sold">Sold</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </div>
          <div>
            <label htmlFor="communication-filter" className="sr-only">Filter by communication</label>
            <select
              id="communication-filter"
              value={communicationFilter}
              onChange={(e) => setCommunicationFilter(e.target.value as any)}
              className="input-field"
            >
              <option value="all">All Properties</option>
              <option value="contacted">Contacted</option>
              <option value="not_contacted">Not Contacted</option>
            </select>
          </div>
        </div>
      </div>

      {/* Properties Grid */}
      {filteredProperties.length === 0 ? (
        <div className="card text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m8 7 4-4 4 4" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No properties found</h3>
          <p className="mt-2 text-gray-600">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'Get started by adding your first property.'
            }
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 btn-primary"
            >
              Add Your First Property
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedProperties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onEdit={() => handleEditProperty(property)}
                onDelete={() => handleDeleteProperty(property.id)}
                onViewDetails={() => setViewingProperty(property)}
              />
            ))}
          </div>
          
          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredProperties.length}
          />
        </>
      )}

      {/* Property Form Modal */}
      {showForm && (
        <PropertyForm
          property={editingProperty}
          onSave={handlePropertySaved}
          onCancel={() => {
            setShowForm(false)
            setEditingProperty(null)
          }}
        />
      )}

      {/* Property Import Modal */}
      {showImport && (
        <PropertyImport
          onImportComplete={handleImportComplete}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* Property Details Modal */}
      {viewingProperty && (
        <PropertyDetailsModal
          property={viewingProperty}
          onClose={() => setViewingProperty(null)}
        />
      )}
    </div>
  )
}
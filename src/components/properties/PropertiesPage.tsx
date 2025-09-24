import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { PropertyCard } from './PropertyCard'
import { PropertyForm } from './PropertyForm'
import { PropertyImport } from './PropertyImport'
import { PropertyDetailsModal } from './PropertyDetailsModal'

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

      // Fetch communication counts for each property
      const { data: communicationsData, error: communicationsError } = await supabase
        .from('communication_history')
        .select('property_id')
        .eq('user_id', user?.id)
        .not('property_id', 'is', null)

      if (communicationsError) throw communicationsError

      // Count communications per property
      const communicationsCount: Record<string, number> = {}
      communicationsData?.forEach(comm => {
        if (comm.property_id) {
          communicationsCount[comm.property_id] = (communicationsCount[comm.property_id] || 0) + 1
        }
      })

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Properties</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">{stats.listed}</div>
          <div className="text-sm text-gray-600">Listed</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.sold}</div>
          <div className="text-sm text-gray-600">Sold</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.withdrawn}</div>
          <div className="text-sm text-gray-600">Withdrawn</div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onEdit={() => handleEditProperty(property)}
              onDelete={() => handleDeleteProperty(property.id)}
              onViewDetails={() => setViewingProperty(property)}
            />
          ))}
        </div>
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
import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { ContactCard } from './ContactCard'
import { ContactForm } from './ContactForm'
import { ContactImport } from './ContactImport'
import { ContactDetailsModal } from './ContactDetailsModal'
import { Pagination } from '../common/Pagination'
import type { Contact } from '../../types/contact'

export function ContactsPage() {
  const { user } = useAuth()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactsCommunications, setContactsCommunications] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [viewingContact, setViewingContact] = useState<Contact | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [followUpFilter, setFollowUpFilter] = useState<'all' | 'due' | 'overdue'>('all')
  const [communicationFilter, setCommunicationFilter] = useState<'all' | 'contacted' | 'not_contacted'>('all')
  const [contactTypeFilter, setContactTypeFilter] = useState<'all' | 'buyer' | 'seller' | 'both'>('all')
  const [temperatureFilter, setTemperatureFilter] = useState<'all' | 'hot' | 'warm' | 'cold'>('all')
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'email_asc' | 'email_desc' | 'contact_type_asc' | 'contact_type_desc' | 'temperature_asc' | 'temperature_desc' | 'created_desc' | 'created_asc' | 'updated_desc' | 'updated_asc'>('created_desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(12)

  useEffect(() => {
    if (user) {
      fetchContacts()
    }
  }, [user])

  const fetchContacts = async () => {
    try {
      // Fetch contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (contactsError) throw contactsError

      // Try to fetch communication counts for each contact
      // If communication_history table doesn't exist, continue without communication data
      const communicationsCount: Record<string, number> = {}
      try {
        const { data: communicationsData, error: communicationsError } = await supabase
          .from('communication_history')
          .select('contact_id')
          .eq('user_id', user?.id)
          .not('contact_id', 'is', null)

        if (communicationsError && communicationsError.code === 'PGRST205') {
          // Table doesn't exist - continue without communication data
          console.warn('Communication history table not found. Communication tracking features will be limited.')
        } else if (communicationsError) {
          throw communicationsError
        } else {
          // Count communications per contact
          communicationsData?.forEach(comm => {
            if (comm.contact_id) {
              communicationsCount[comm.contact_id] = (communicationsCount[comm.contact_id] || 0) + 1
            }
          })
        }
      } catch (commError) {
        console.warn('Could not fetch communication history:', commError)
        // Continue without communication data
      }

      setContacts(contactsData || [])
      setContactsCommunications(communicationsCount)
    } catch (error) {
      console.error('Error fetching contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleContactSaved = () => {
    fetchContacts()
    setShowForm(false)
    setEditingContact(null)
  }

  const handleImportComplete = (importedCount: number) => {
    fetchContacts()
    setShowImport(false)
    alert(`Successfully imported ${importedCount} contacts!`)
  }

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact)
    setShowForm(true)
  }

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId)
        .eq('user_id', user?.id)

      if (error) throw error
      setContacts(prev => prev.filter(c => c.id !== contactId))
    } catch (error) {
      console.error('Error deleting contact:', error)
      alert('Error deleting contact. Please try again.')
    }
  }

  const filteredContacts = contacts.filter(contact => {
    const today = new Date()
    const followUpDate = contact.follow_up_date ? new Date(contact.follow_up_date) : null

    const matchesSearch =
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phone?.includes(searchTerm) ||
      contact.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.suburb?.toLowerCase().includes(searchTerm.toLowerCase())


    const matchesFollowUp =
      followUpFilter === 'all' ||
      (followUpFilter === 'due' && followUpDate && followUpDate <= today) ||
      (followUpFilter === 'overdue' && followUpDate && followUpDate < today)

    const communicationCount = contactsCommunications[contact.id] || 0
    const matchesCommunication =
      communicationFilter === 'all' ||
      (communicationFilter === 'contacted' && communicationCount > 0) ||
      (communicationFilter === 'not_contacted' && communicationCount === 0)

    const matchesContactType = contactTypeFilter === 'all' || contact.contact_type === contactTypeFilter
    const matchesTemperature = temperatureFilter === 'all' || contact.temperature === temperatureFilter

    return matchesSearch && matchesFollowUp && matchesCommunication && matchesContactType && matchesTemperature
  })

  // Sort contacts based on selected sort option
  const sortedContacts = [...filteredContacts].sort((a, b) => {
    switch (sortBy) {
      case 'name_asc':
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
      case 'name_desc':
        return b.name.toLowerCase().localeCompare(a.name.toLowerCase())
      case 'email_asc':
        return (a.email || '').toLowerCase().localeCompare((b.email || '').toLowerCase())
      case 'email_desc':
        return (b.email || '').toLowerCase().localeCompare((a.email || '').toLowerCase())
      case 'created_asc':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      case 'created_desc':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'updated_asc':
        return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
      case 'updated_desc':
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      case 'contact_type_asc':
        return a.contact_type.localeCompare(b.contact_type)
      case 'contact_type_desc':
        return b.contact_type.localeCompare(a.contact_type)
      case 'temperature_asc':
        return a.temperature.localeCompare(b.temperature)
      case 'temperature_desc':
        return b.temperature.localeCompare(a.temperature)
      default:
        return 0
    }
  })

  // Pagination logic
  const totalPages = Math.ceil(sortedContacts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedContacts = sortedContacts.slice(startIndex, endIndex)

  // Reset to first page when filters or sort change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, followUpFilter, communicationFilter, contactTypeFilter, temperatureFilter, sortBy])

  const stats = {
    total: contacts.length,
    followUpsDue: contacts.filter(c => {
      const followUpDate = c.follow_up_date ? new Date(c.follow_up_date) : null
      return followUpDate && followUpDate <= new Date()
    }).length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600 dark:text-primary-300">Loading contacts...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contacts</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your contact database and follow-ups</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            Add Contact
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="btn-secondary"
          >
            Import CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-stats">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-primary-900 dark:text-white mb-1">{stats.total}</div>
          <div className="text-sm font-medium text-primary-600 dark:text-primary-400">Total Contacts</div>
        </div>
        <div className="card-stats">
          <div className="w-12 h-12 bg-gradient-to-br from-error-500 to-error-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-error-600 dark:text-error-400 mb-1">{stats.followUpsDue}</div>
          <div className="text-sm font-medium text-primary-600 dark:text-primary-400">Follow-ups Due</div>
        </div>
      </div>

      {/* Filters and Sort */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="search" className="sr-only">Search contacts</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400 dark:text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                id="search"
                type="text"
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div>
            <label htmlFor="followup-filter" className="sr-only">Filter by follow-up</label>
            <select
              id="followup-filter"
              value={followUpFilter}
              onChange={(e) => setFollowUpFilter(e.target.value as any)}
              className="input-field"
            >
              <option value="all">All Follow-ups</option>
              <option value="due">Due Today</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <div>
            <label htmlFor="sort-filter" className="sr-only">Sort contacts</label>
            <select
              id="sort-filter"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="input-field"
            >
              <option value="created_desc">Newest First</option>
              <option value="created_asc">Oldest First</option>
              <option value="updated_desc">Recently Modified</option>
              <option value="updated_asc">Least Modified</option>
              <option value="name_asc">Name A-Z</option>
              <option value="name_desc">Name Z-A</option>
              <option value="email_asc">Email A-Z</option>
              <option value="email_desc">Email Z-A</option>
              <option value="contact_type_asc">Contact Type A-Z</option>
              <option value="contact_type_desc">Contact Type Z-A</option>
              <option value="temperature_asc">Temperature A-Z</option>
              <option value="temperature_desc">Temperature Z-A</option>
            </select>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="communication-filter" className="sr-only">Filter by communication</label>
            <select
              id="communication-filter"
              value={communicationFilter}
              onChange={(e) => setCommunicationFilter(e.target.value as any)}
              className="input-field"
            >
              <option value="all">All Contacts</option>
              <option value="contacted">Contacted</option>
              <option value="not_contacted">Not Contacted</option>
            </select>
          </div>
          <div>
            <label htmlFor="contact-type-filter" className="sr-only">Filter by contact type</label>
            <select
              id="contact-type-filter"
              value={contactTypeFilter}
              onChange={(e) => setContactTypeFilter(e.target.value as any)}
              className="input-field"
            >
              <option value="all">All Types</option>
              <option value="buyer">👤 Buyers</option>
              <option value="seller">🏠 Sellers</option>
              <option value="both">🔄 Both</option>
            </select>
          </div>
          <div>
            <label htmlFor="temperature-filter" className="sr-only">Filter by temperature</label>
            <select
              id="temperature-filter"
              value={temperatureFilter}
              onChange={(e) => setTemperatureFilter(e.target.value as any)}
              className="input-field"
            >
              <option value="all">All Temperatures</option>
              <option value="hot">🔥 Hot</option>
              <option value="warm">🟡 Warm</option>
              <option value="cold">🔵 Cold</option>
            </select>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-primary-400 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              Showing {sortedContacts.length} of {contacts.length} contacts
              {!['created_desc', 'updated_desc'].includes(sortBy) && (
                <span className="ml-2 text-primary-600 dark:text-primary-300">
                  • Sorted by {
                    sortBy === 'name_asc' ? 'Name (A-Z)' :
                    sortBy === 'name_desc' ? 'Name (Z-A)' :
                    sortBy === 'email_asc' ? 'Email (A-Z)' :
                    sortBy === 'email_desc' ? 'Email (Z-A)' :
                    sortBy === 'contact_type_asc' ? 'Contact Type (A-Z)' :
                    sortBy === 'contact_type_desc' ? 'Contact Type (Z-A)' :
                    sortBy === 'temperature_asc' ? 'Temperature (A-Z)' :
                    sortBy === 'temperature_desc' ? 'Temperature (Z-A)' :
                    sortBy === 'created_asc' ? 'Date Created (Oldest)' :
                    sortBy === 'created_desc' ? 'Date Created (Newest)' :
                    sortBy === 'updated_asc' ? 'Date Modified (Oldest)' :
                    sortBy === 'updated_desc' ? 'Date Modified (Newest)' : 'Default'
                  }
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contacts Grid */}
      {sortedContacts.length === 0 ? (
        <div className="card text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No contacts found</h3>
          <p className="mt-2 text-gray-600 dark:text-primary-400">
            {searchTerm || followUpFilter !== 'all' || communicationFilter !== 'all'
              || contactTypeFilter !== 'all' || temperatureFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'Get started by adding your first contact or importing a CSV file.'
            }
          </p>
          {!searchTerm && followUpFilter === 'all' && communicationFilter === 'all' && contactTypeFilter === 'all' && temperatureFilter === 'all' && (
            <div className="mt-6 flex justify-center space-x-3">
              <button
                onClick={() => setShowForm(true)}
                className="btn-primary"
              >
                Add First Contact
              </button>
              <button
                onClick={() => setShowImport(true)}
                className="btn-secondary"
              >
                Import CSV
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedContacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onEdit={() => handleEditContact(contact)}
                onDelete={() => handleDeleteContact(contact.id)}
                onViewDetails={() => setViewingContact(contact)}
              />
            ))}
          </div>
          
          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={sortedContacts.length}
          />
        </>
      )}

      {/* Contact Form Modal */}
      {showForm && (
        <ContactForm
          contact={editingContact}
          onSave={handleContactSaved}
          onCancel={() => {
            setShowForm(false)
            setEditingContact(null)
          }}
        />
      )}

      {/* Contact Import Modal */}
      {showImport && (
        <ContactImport
          onImportComplete={handleImportComplete}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* Contact Details Modal */}
      {viewingContact && (
        <ContactDetailsModal
          contact={viewingContact}
          onClose={() => setViewingContact(null)}
        />
      )}
    </div>
  )
}
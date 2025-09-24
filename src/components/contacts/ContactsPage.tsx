import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { ContactCard } from './ContactCard'
import { ContactForm } from './ContactForm'
import { ContactImport } from './ContactImport'
import { ContactDetailsModal } from './ContactDetailsModal'

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
  const [sourceFilter, setSourceFilter] = useState<'all' | 'manual' | 'import' | 'campaign' | 'referral'>('all')
  const [followUpFilter, setFollowUpFilter] = useState<'all' | 'due' | 'overdue'>('all')
  const [communicationFilter, setCommunicationFilter] = useState<'all' | 'contacted' | 'not_contacted'>('all')

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

      // Fetch communication counts for each contact
      const { data: communicationsData, error: communicationsError } = await supabase
        .from('communication_history')
        .select('contact_id')
        .eq('user_id', user?.id)
        .not('contact_id', 'is', null)

      if (communicationsError) throw communicationsError

      // Count communications per contact
      const communicationsCount: Record<string, number> = {}
      communicationsData?.forEach(comm => {
        if (comm.contact_id) {
          communicationsCount[comm.contact_id] = (communicationsCount[comm.contact_id] || 0) + 1
        }
      })

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

    const matchesSource = sourceFilter === 'all' || contact.contact_source === sourceFilter

    const matchesFollowUp =
      followUpFilter === 'all' ||
      (followUpFilter === 'due' && followUpDate && followUpDate <= today) ||
      (followUpFilter === 'overdue' && followUpDate && followUpDate < today)

    const communicationCount = contactsCommunications[contact.id] || 0
    const matchesCommunication =
      communicationFilter === 'all' ||
      (communicationFilter === 'contacted' && communicationCount > 0) ||
      (communicationFilter === 'not_contacted' && communicationCount === 0)

    return matchesSearch && matchesSource && matchesFollowUp && matchesCommunication
  })

  const stats = {
    total: contacts.length,
    manual: contacts.filter(c => c.contact_source === 'manual').length,
    imported: contacts.filter(c => c.contact_source === 'import').length,
    campaign: contacts.filter(c => c.contact_source === 'campaign').length,
    followUpsDue: contacts.filter(c => {
      const followUpDate = c.follow_up_date ? new Date(c.follow_up_date) : null
      return followUpDate && followUpDate <= new Date()
    }).length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600">Loading contacts...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-600">Manage your contact database and follow-ups</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Contact
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="btn-secondary"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            Import CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Contacts</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.manual}</div>
          <div className="text-sm text-gray-600">Manual</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">{stats.imported}</div>
          <div className="text-sm text-gray-600">Imported</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.campaign}</div>
          <div className="text-sm text-gray-600">From Campaigns</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-red-600">{stats.followUpsDue}</div>
          <div className="text-sm text-gray-600">Follow-ups Due</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="search" className="sr-only">Search contacts</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <label htmlFor="source-filter" className="sr-only">Filter by source</label>
            <select
              id="source-filter"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as any)}
              className="input-field"
            >
              <option value="all">All Sources</option>
              <option value="manual">Manual Entry</option>
              <option value="import">Imported</option>
              <option value="campaign">From Campaign</option>
              <option value="referral">Referral</option>
            </select>
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
        </div>
      </div>

      {/* Contacts Grid */}
      {filteredContacts.length === 0 ? (
        <div className="card text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No contacts found</h3>
          <p className="mt-2 text-gray-600">
            {searchTerm || sourceFilter !== 'all' || followUpFilter !== 'all' || communicationFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'Get started by adding your first contact or importing a CSV file.'
            }
          </p>
          {!searchTerm && sourceFilter === 'all' && followUpFilter === 'all' && communicationFilter === 'all' && (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onEdit={() => handleEditContact(contact)}
              onDelete={() => handleDeleteContact(contact.id)}
              onViewDetails={() => setViewingContact(contact)}
            />
          ))}
        </div>
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
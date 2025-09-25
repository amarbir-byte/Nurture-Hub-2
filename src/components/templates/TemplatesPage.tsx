import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { TemplateCard } from './TemplateCard'
import { TemplateForm } from './TemplateForm'

interface Template {
  id: string
  user_id: string
  name: string
  content: string
  category: 'listing' | 'sold' | 'follow_up' | 'marketing' | 'custom'
  placeholders: string[]
  is_default: boolean
  usage_count: number
  created_at: string
  updated_at: string
}

export function TemplatesPage() {
  const { user } = useAuth()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'listing' | 'sold' | 'follow_up' | 'marketing' | 'custom'>('all')

  useEffect(() => {
    if (user) {
      fetchTemplates()
    }
  }, [user])

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTemplateSaved = () => {
    fetchTemplates()
    setShowForm(false)
    setEditingTemplate(null)
  }

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template)
    setShowForm(true)
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', templateId)
        .eq('user_id', user?.id)

      if (error) throw error
      setTemplates(prev => prev.filter(t => t.id !== templateId))
    } catch (error) {
      console.error('Error deleting template:', error)
      alert('Error deleting template. Please try again.')
    }
  }

  const handleDuplicateTemplate = async (template: Template) => {
    try {
      const templateData = {
        name: `${template.name} (Copy)`,
        content: template.content,
        category: template.category,
        placeholders: template.placeholders,
        is_default: false,
        usage_count: 0,
        user_id: user?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('templates')
        .insert([templateData])

      if (error) throw error
      fetchTemplates()
    } catch (error) {
      console.error('Error duplicating template:', error)
      alert('Error duplicating template. Please try again.')
    }
  }

  const createDefaultTemplates = async () => {
    const defaultTemplates = [
      {
        name: 'New Listing Alert',
        content: 'Hi [HomeownerName], I just listed a beautiful [PropertyType] at [PropertyAddress] for [PropertyPrice]. Given your location at [ContactAddress], this might be of interest to you. Would you like more details?',
        category: 'listing' as const,
        placeholders: ['HomeownerName', 'PropertyType', 'PropertyAddress', 'PropertyPrice', 'ContactAddress'],
        is_default: true,
        usage_count: 0,
      },
      {
        name: 'Just Sold Notification',
        content: 'Great news [HomeownerName]! I just sold [PropertyAddress] for [PropertyPrice]. If you\'re considering selling your property at [ContactAddress], I\'d love to discuss current market conditions with you.',
        category: 'sold' as const,
        placeholders: ['HomeownerName', 'PropertyAddress', 'PropertyPrice', 'ContactAddress'],
        is_default: true,
        usage_count: 0,
      },
      {
        name: 'Follow-up Reminder',
        content: 'Hi [HomeownerName], following up on our previous conversation about [PropertyAddress]. Have you had a chance to consider our discussion? I\'m here to answer any questions you might have.',
        category: 'follow_up' as const,
        placeholders: ['HomeownerName', 'PropertyAddress'],
        is_default: true,
        usage_count: 0,
      },
      {
        name: 'Market Update',
        content: 'Hi [HomeownerName], the property market in [Suburb] has been active lately. Properties similar to yours at [ContactAddress] have been selling well. Would you like a free market appraisal?',
        category: 'marketing' as const,
        placeholders: ['HomeownerName', 'Suburb', 'ContactAddress'],
        is_default: true,
        usage_count: 0,
      }
    ]

    try {
      const templatesWithUser = defaultTemplates.map(template => ({
        ...template,
        user_id: user?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))

      const { error } = await supabase
        .from('templates')
        .insert(templatesWithUser)

      if (error) throw error
      fetchTemplates()
    } catch (error) {
      console.error('Error creating default templates:', error)
      alert('Error creating default templates. Please try again.')
    }
  }

  const filteredTemplates = templates.filter(template => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.content.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter

    return matchesSearch && matchesCategory
  })

  const stats = {
    total: templates.length,
    listing: templates.filter(t => t.category === 'listing').length,
    sold: templates.filter(t => t.category === 'sold').length,
    follow_up: templates.filter(t => t.category === 'follow_up').length,
    marketing: templates.filter(t => t.category === 'marketing').length,
    custom: templates.filter(t => t.category === 'custom').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600 dark:text-primary-300">Loading templates...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SMS Templates</h1>
          <p className="text-gray-600 dark:text-gray-400">Create and manage reusable SMS templates for your campaigns</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            Create Template
          </button>
          {templates.length === 0 && (
            <button
              onClick={createDefaultTemplates}
              className="btn-secondary"
            >
              Add Default Templates
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
          <div className="text-sm text-gray-600 dark:text-primary-400">Total Templates</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">{stats.listing}</div>
          <div className="text-sm text-gray-600 dark:text-primary-400">Listing</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.sold}</div>
          <div className="text-sm text-gray-600 dark:text-primary-400">Sold</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.follow_up}</div>
          <div className="text-sm text-gray-600 dark:text-primary-400">Follow-up</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.marketing}</div>
          <div className="text-sm text-gray-600 dark:text-primary-400">Marketing</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-gray-600 dark:text-primary-400">{stats.custom}</div>
          <div className="text-sm text-gray-600 dark:text-primary-400">Custom</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="search" className="sr-only">Search templates</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400 dark:text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                id="search"
                type="text"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div>
            <label htmlFor="category-filter" className="sr-only">Filter by category</label>
            <select
              id="category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="input-field"
            >
              <option value="all">All Categories</option>
              <option value="listing">Listing</option>
              <option value="sold">Sold</option>
              <option value="follow_up">Follow-up</option>
              <option value="marketing">Marketing</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="card text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No templates found</h3>
          <p className="mt-2 text-gray-600 dark:text-primary-400">
            {searchTerm || categoryFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'Get started by creating your first template or adding default templates.'
            }
          </p>
          {!searchTerm && categoryFilter === 'all' && (
            <div className="mt-6 flex justify-center space-x-3">
              <button
                onClick={() => setShowForm(true)}
                className="btn-primary"
              >
                Create First Template
              </button>
              <button
                onClick={createDefaultTemplates}
                className="btn-secondary"
              >
                Add Default Templates
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={() => handleEditTemplate(template)}
              onDelete={() => handleDeleteTemplate(template.id)}
              onDuplicate={() => handleDuplicateTemplate(template)}
            />
          ))}
        </div>
      )}

      {/* Template Form Modal */}
      {showForm && (
        <TemplateForm
          template={editingTemplate}
          onSave={handleTemplateSaved}
          onCancel={() => {
            setShowForm(false)
            setEditingTemplate(null)
          }}
        />
      )}
    </div>
  )
}
import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { type MessageTemplate, getTemplatesByType } from '../../utils/messageTemplates'

interface DatabaseTemplate {
  id: string
  name: string
  content: string
  category: string
  placeholders: string[]
  created_at: string
  updated_at: string
}

interface TemplateSelectorProps {
  type: 'email' | 'sms'
  category?: 'property' | 'contact' | 'general'
  selectedTemplateId?: string
  onTemplateSelect: (template: MessageTemplate | null) => void
  className?: string
}

export function TemplateSelector({
  type,
  category,
  selectedTemplateId,
  onTemplateSelect,
  className = ''
}: TemplateSelectorProps) {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [databaseTemplates, setDatabaseTemplates] = useState<DatabaseTemplate[]>([])
  const [loading, setLoading] = useState(false)
  
  // Get hardcoded templates as fallback
  const hardcodedTemplates = getTemplatesByType(type, category)
  
  // Convert database template to MessageTemplate format
  const convertDatabaseTemplate = (dbTemplate: DatabaseTemplate): MessageTemplate => ({
    id: dbTemplate.id,
    name: dbTemplate.name,
    type: type,
    category: dbTemplate.category as 'property' | 'contact' | 'general',
    message: dbTemplate.content,
    variables: dbTemplate.placeholders || []
  })
  
  // Combine database and hardcoded templates
  const allTemplates = [
    ...databaseTemplates.map(convertDatabaseTemplate),
    ...hardcodedTemplates
  ]
  
  const selectedTemplate = allTemplates.find(t => t.id === selectedTemplateId)

  // Fetch database templates
  useEffect(() => {
    if (user && isOpen) {
      fetchDatabaseTemplates()
    }
  }, [user, isOpen])

  const fetchDatabaseTemplates = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDatabaseTemplates(data || [])
    } catch (error) {
      console.error('Error fetching database templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTemplateSelect = (template: MessageTemplate) => {
    onTemplateSelect(template)
    setIsOpen(false)
  }

  const handleClearSelection = () => {
    onTemplateSelect(null)
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Message Template
      </label>
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
      >
        <div className="flex items-center justify-between">
          <span className={selectedTemplate ? 'text-gray-900' : 'text-gray-500'}>
            {selectedTemplate ? selectedTemplate.name : 'Select a template...'}
          </span>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          <div className="p-2">
            <button
              onClick={handleClearSelection}
              className="w-full px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 rounded"
            >
              ✏️ Write custom message
            </button>
          </div>
          
          {allTemplates.length > 0 && (
            <div className="border-t border-gray-200">
              <div className="p-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {category ? `${category} templates` : 'Templates'}
                  </div>
                  {loading && (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-600"></div>
                  )}
                </div>
                {allTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className={`w-full px-3 py-2 text-left text-sm rounded hover:bg-gray-50 ${
                      selectedTemplateId === template.id ? 'bg-primary-50 text-primary-700' : 'text-gray-900'
                    }`}
                  >
                    <div className="font-medium">{template.name}</div>
                    <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {template.message.substring(0, 100)}...
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

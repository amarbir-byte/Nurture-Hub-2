import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

interface Template {
  id: string
  user_id: string
  name: string
  content: string
  category: 'listing' | 'sold' | 'follow_up' | 'marketing' | 'sms' | 'custom'
  placeholders: string[]
  is_default: boolean
  usage_count: number
  created_at: string
  updated_at: string
}

interface TemplateFormProps {
  template?: Template | null
  onSave: () => void
  onCancel: () => void
}

interface FormData {
  name: string
  content: string
  category: 'listing' | 'sold' | 'follow_up' | 'marketing' | 'sms' | 'custom'
}

const availablePlaceholders = [
  { key: 'HomeownerName', description: 'Contact\'s name' },
  { key: 'ContactName', description: 'Contact\'s name (SMS preferred)' },
  { key: 'ContactAddress', description: 'Contact\'s address' },
  { key: 'PropertyAddress', description: 'Property address' },
  { key: 'PropertyPrice', description: 'Property price' },
  { key: 'PropertyType', description: 'Property type (house, apartment, etc.)' },
  { key: 'PropertyCount', description: 'Number/description of properties (SMS)' },
  { key: 'PropertyDetails', description: 'Property sale details (SMS)' },
  { key: 'Suburb', description: 'Property or contact suburb' },
  { key: 'City', description: 'Property or contact city' },
  { key: 'AgentName', description: 'Your name' },
  { key: 'AgentPhone', description: 'Your phone number' },
  { key: 'CompanyName', description: 'Your company name' },
  { key: 'Date', description: 'Current date' },
  { key: 'Time', description: 'Current time' },
]

export function TemplateForm({ template, onSave, onCancel }: TemplateFormProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<FormData>>({})

  const [formData, setFormData] = useState<FormData>({
    name: template?.name || '',
    content: template?.content || '',
    category: template?.category || 'custom',
  })

  const [previewMode, setPreviewMode] = useState(false)

  const detectPlaceholders = (content: string): string[] => {
    const placeholderRegex = /\[([^\]]+)\]/g
    const matches = content.match(placeholderRegex)
    if (!matches) return []

    return [...new Set(matches.map(match => match.slice(1, -1)))]
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required'
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Template content is required'
    } else if (formData.content.length > 1000) {
      newErrors.content = 'Template content must be less than 1000 characters'
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
      const placeholders = detectPlaceholders(formData.content)

      const templateData = {
        name: formData.name.trim(),
        content: formData.content.trim(),
        category: formData.category,
        placeholders,
        is_default: false,
        usage_count: template?.usage_count || 0,
        user_id: user?.id,
        updated_at: new Date().toISOString(),
      }

      let result
      if (template) {
        // Update existing template
        result = await supabase
          .from('templates')
          .update(templateData)
          .eq('id', template.id)
          .eq('user_id', user?.id)
      } else {
        // Create new template
        result = await supabase
          .from('templates')
          .insert([{ ...templateData, created_at: new Date().toISOString() }])
      }

      if (result.error) throw result.error

      onSave()
    } catch (error) {
      console.error('Error saving template:', error)
      alert('Error saving template. Please try again.')
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

  const insertPlaceholder = (placeholder: string) => {
    const textarea = document.getElementById('content') as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = formData.content
    const before = text.substring(0, start)
    const after = text.substring(end, text.length)
    const newContent = before + `[${placeholder}]` + after

    handleInputChange('content', newContent)

    // Restore cursor position after the inserted placeholder
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + placeholder.length + 2, start + placeholder.length + 2)
    }, 0)
  }

  const getCharacterCount = () => {
    const length = formData.content.length
    if (length <= 160) {
      return { count: length, color: 'text-green-600', label: '1 SMS', max: 160 }
    } else if (length <= 320) {
      return { count: length, color: 'text-yellow-600', label: '2 SMS', max: 320 }
    } else {
      return { count: length, color: 'text-red-600', label: `${Math.ceil(length / 160)} SMS`, max: 1000 }
    }
  }

  const charCount = getCharacterCount()
  const detectedPlaceholders = detectPlaceholders(formData.content)

  const renderPreview = () => {
    let preview = formData.content

    // Replace placeholders with sample data for preview
    const sampleData: Record<string, string> = {
      'HomeownerName': 'John Smith',
      'ContactAddress': '123 Queen Street, Auckland',
      'PropertyAddress': '456 Main Road, Ponsonby',
      'PropertyPrice': '$850,000',
      'PropertyType': 'house',
      'Suburb': 'Ponsonby',
      'City': 'Auckland',
      'AgentName': 'Your Name',
      'AgentPhone': '+64 21 123 4567',
      'CompanyName': 'Your Company',
      'Date': new Date().toLocaleDateString('en-NZ'),
      'Time': new Date().toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' }),
    }

    detectedPlaceholders.forEach(placeholder => {
      const regex = new RegExp(`\\[${placeholder}\\]`, 'g')
      preview = preview.replace(regex, sampleData[placeholder] || `[${placeholder}]`)
    })

    return preview
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto dark:bg-dark-800">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {template ? 'Edit Template' : 'Create New Template'}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-500 dark:text-primary-300 dark:hover:text-primary-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name & Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-primary-300 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`input-field ${errors.name ? 'border-red-500' : ''}`}
                  placeholder="New Listing Alert"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-primary-300 mb-1">
                  Category
                </label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="input-field"
                >
                  <option value="listing">Listing</option>
                  <option value="sold">Sold</option>
                  <option value="follow_up">Follow-up</option>
                  <option value="marketing">Marketing</option>
                  <option value="sms">SMS</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>

            {/* Content */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-primary-300">
                  Message Content *
                </label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setPreviewMode(!previewMode)}
                    className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-300 dark:hover:text-primary-100"
                  >
                    {previewMode ? 'Edit' : 'Preview'}
                  </button>
                  <span className={`text-sm ${charCount.color}`}>
                    {charCount.count}/{charCount.max} • {charCount.label}
                  </span>
                </div>
              </div>

              {previewMode ? (
                <div className="min-h-32 p-3 border border-gray-300 rounded-md bg-gray-50 dark:bg-dark-700 dark:border-dark-600">
                  <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                    {renderPreview()}
                  </p>
                </div>
              ) : (
                <textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                  className={`input-field min-h-32 ${errors.content ? 'border-red-500' : ''}`}
                  placeholder="Hi [HomeownerName], I just listed a property at [PropertyAddress]..."
                  rows={6}
                />
              )}

              {errors.content && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.content}</p>
              )}
            </div>

            {/* Placeholders */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Available Placeholders */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-primary-300 mb-3">Available Placeholders</h3>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg dark:border-dark-700">
                  {availablePlaceholders.map((placeholder) => (
                    <button
                      key={placeholder.key}
                      type="button"
                      onClick={() => insertPlaceholder(placeholder.key)}
                      className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 dark:hover:bg-dark-700 dark:border-dark-800"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          [{placeholder.key}]
                        </span>
                        <svg className="w-4 h-4 text-gray-400 dark:text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-primary-400 mt-1">{placeholder.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Detected Placeholders */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-primary-300 mb-3">
                  Detected Placeholders ({detectedPlaceholders.length})
                </h3>
                <div className="border border-gray-200 rounded-lg p-3 min-h-48 dark:border-dark-700">
                  {detectedPlaceholders.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-primary-400">
                      No placeholders detected. Click on placeholders from the left to add them to your template.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {detectedPlaceholders.map((placeholder, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/20 dark:text-primary-300"
                        >
                          [{placeholder}]
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-blue-50 border-blue-200 rounded-lg p-4 dark:bg-blue-900/20 dark:border-blue-700">
              <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Template Tips:</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <li>• Keep messages under 160 characters for single SMS</li>
                <li>• Use placeholders to personalize messages automatically</li>
                <li>• Include a clear call-to-action</li>
                <li>• Test templates with the preview function</li>
                <li>• Consider your audience and message timing</li>
              </ul>
            </div>

            {/* Form Actions */}
            <div className="flex space-x-3 pt-6 border-t border-gray-200 dark:border-dark-700">
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
                  template ? 'Update Template' : 'Create Template'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
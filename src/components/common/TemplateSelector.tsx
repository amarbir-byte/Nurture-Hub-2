import { useState } from 'react'
import { type MessageTemplate, getTemplatesByType } from '../../utils/messageTemplates'

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
  const [isOpen, setIsOpen] = useState(false)
  
  const templates = getTemplatesByType(type, category)
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId)

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
          
          {templates.length > 0 && (
            <div className="border-t border-gray-200">
              <div className="p-2">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  {category ? `${category} templates` : 'Templates'}
                </div>
                {templates.map((template) => (
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

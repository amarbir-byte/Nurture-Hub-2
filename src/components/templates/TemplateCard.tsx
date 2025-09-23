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

interface TemplateCardProps {
  template: Template
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
}

export function TemplateCard({ template, onEdit, onDelete, onDuplicate }: TemplateCardProps) {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'listing':
        return 'bg-green-100 text-green-800'
      case 'sold':
        return 'bg-blue-100 text-blue-800'
      case 'follow_up':
        return 'bg-purple-100 text-purple-800'
      case 'marketing':
        return 'bg-yellow-100 text-yellow-800'
      case 'custom':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'listing':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m3 12 2-2m0 0 7-7 7 7M5 10v10a1 1 0 0 0 1 1h3m0 0h6m0 0h3a1 1 0 0 0 1-1V10M9 21v-6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6" />
          </svg>
        )
      case 'sold':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'follow_up':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'marketing':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
        )
      case 'custom':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )
      default:
        return null
    }
  }

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(template.content)
      // Simple success feedback - in a real app you'd want a toast notification
      const button = document.getElementById(`copy-${template.id}`)
      if (button) {
        const originalText = button.textContent
        button.textContent = 'Copied!'
        setTimeout(() => {
          button.textContent = originalText
        }, 1000)
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error)
    }
  }

  const getCharacterCount = () => {
    const length = template.content.length
    if (length <= 160) {
      return { count: length, color: 'text-green-600', label: '1 SMS' }
    } else if (length <= 320) {
      return { count: length, color: 'text-yellow-600', label: '2 SMS' }
    } else {
      return { count: length, color: 'text-red-600', label: `${Math.ceil(length / 160)} SMS` }
    }
  }

  const charCount = getCharacterCount()

  return (
    <div className="card hover:shadow-lg transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className={`badge ${getCategoryColor(template.category)} flex items-center`}>
            {getCategoryIcon(template.category)}
            <span className="ml-1 capitalize">{template.category.replace('_', ' ')}</span>
          </span>
          {template.is_default && (
            <span className="badge bg-blue-100 text-blue-800">
              Default
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500">
          Used {template.usage_count} times
        </div>
      </div>

      {/* Template Name */}
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        {template.name}
      </h3>

      {/* Template Content */}
      <div className="mb-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {template.content}
          </p>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className={`font-medium ${charCount.color}`}>
            {charCount.count} characters • {charCount.label}
          </span>
          <button
            id={`copy-${template.id}`}
            onClick={handleCopyToClipboard}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Copy
          </button>
        </div>
      </div>

      {/* Placeholders */}
      {template.placeholders && template.placeholders.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-medium text-gray-700 mb-2">Placeholders:</h4>
          <div className="flex flex-wrap gap-1">
            {template.placeholders.slice(0, 4).map((placeholder, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary-100 text-primary-800"
              >
                [{placeholder}]
              </span>
            ))}
            {template.placeholders.length > 4 && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                +{template.placeholders.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex space-x-2 mb-4">
        <button
          onClick={handleCopyToClipboard}
          className="flex-1 btn-secondary text-xs py-2"
          title="Copy template"
        >
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </button>
        <button
          onClick={onDuplicate}
          className="flex-1 btn-secondary text-xs py-2"
          title="Duplicate template"
        >
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2v-2a2 2 0 00-2-2H8z" />
          </svg>
          Duplicate
        </button>
      </div>

      {/* Edit/Delete Actions */}
      <div className="flex space-x-2 pt-4 border-t border-gray-200">
        <button
          onClick={onEdit}
          className="flex-1 btn-secondary text-sm"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit
        </button>
        <button
          onClick={onDelete}
          className="flex-1 btn-ghost text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
          disabled={template.is_default}
          title={template.is_default ? 'Cannot delete default templates' : 'Delete template'}
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </button>
      </div>
    </div>
  )
}
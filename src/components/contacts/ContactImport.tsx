import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { geocode } from '../../lib/geocoding'

interface ImportContact {
  name: string
  email?: string
  phone?: string
  address: string
  suburb?: string
  city?: string
  postal_code?: string
  notes?: string
  tags?: string[]
  [key: string]: any
}

interface ContactImportProps {
  onImportComplete: (importedCount: number) => void
  onClose: () => void
}

export function ContactImport({ onImportComplete, onClose }: ContactImportProps) {
  const { user } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState<ImportContact[]>([])
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<string[]>([])
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload')

  const requiredFields = ['name', 'address']
  const optionalFields = ['email', 'phone', 'suburb', 'city', 'postal_code', 'notes', 'tags']
  const allFields = [...requiredFields, ...optionalFields]

  const mockGeocode = async (_address: string) => {
    const nzCities = [
      { name: 'Auckland', lat: -36.8485, lng: 174.7633 },
      { name: 'Wellington', lat: -41.2865, lng: 174.7762 },
      { name: 'Christchurch', lat: -43.5321, lng: 172.6362 },
      { name: 'Hamilton', lat: -37.7870, lng: 175.2793 },
      { name: 'Tauranga', lat: -37.6878, lng: 176.1651 },
    ]

    const randomCity = nzCities[Math.floor(Math.random() * nzCities.length)]
    return {
      lat: randomCity.lat + (Math.random() - 0.5) * 0.1,
      lng: randomCity.lng + (Math.random() - 0.5) * 0.1,
    }
  }


  const parseTSV = (tsvText: string): { headers: string[], rows: string[][] } => {
    const lines = tsvText.split('\n').filter(line => line.trim())
    if (lines.length === 0) throw new Error('TSV file is empty')

    const headers = lines[0].split('\t').map(h => h.trim())
    const rows = lines.slice(1).map(line => line.split('\t').map(cell => cell.trim()))

    return { headers, rows }
  }

  const parseExcelCSV = (csvText: string): { headers: string[], rows: string[][] } => {
    // Handle Excel-exported CSV which might use semicolons
    const lines = csvText.split('\n').filter(line => line.trim())
    if (lines.length === 0) throw new Error('File is empty')

    // Try to detect delimiter
    const firstLine = lines[0]
    const delimiter = firstLine.includes(';') ? ';' : ','

    const headers = firstLine.split(delimiter).map(h => h.trim().replace(/"/g, ''))
    const rows = lines.slice(1).map(line => {
      return line.split(delimiter).map(cell => cell.trim().replace(/"/g, ''))
    })

    return { headers, rows }
  }

  const parseExcelFile = async (_arrayBuffer: ArrayBuffer): Promise<{ headers: string[], rows: string[][] }> => {
    // For now, we'll provide instructions for Excel users to export as CSV
    // In a real implementation, you'd use a library like SheetJS
    throw new Error('Excel file support: Please export your Excel file as CSV format for import. Excel files will be fully supported in the next update.')
  }

  const parseFile = async (file: File): Promise<{ headers: string[], rows: string[][] }> => {
    const fileName = file.name.toLowerCase()

    if (fileName.endsWith('.xlsx')) {
      const arrayBuffer = await file.arrayBuffer()
      return await parseExcelFile(arrayBuffer)
    } else if (fileName.endsWith('.tsv')) {
      const text = await file.text()
      return parseTSV(text)
    } else {
      // CSV, TXT, or other delimited files
      const text = await file.text()
      return parseExcelCSV(text)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    const fileName = selectedFile.name.toLowerCase()
    const supportedTypes = ['.csv', '.tsv', '.txt', '.xlsx']

    if (!supportedTypes.some(type => fileName.endsWith(type))) {
      setErrors(['Please select a CSV, TSV, TXT, or Excel (.xlsx) file'])
      return
    }

    setFile(selectedFile)
    setErrors([])

    try {
      let headers: string[]

      if (fileName.endsWith('.xlsx')) {
        // For Excel files, we'll create a simple reader that converts to CSV format
        const arrayBuffer = await selectedFile.arrayBuffer()
        const { headers: xlsxHeaders } = await parseExcelFile(arrayBuffer)
        headers = xlsxHeaders
      } else {
        // Handle text-based files
        const text = await selectedFile.text()

        if (fileName.endsWith('.tsv')) {
          const { headers: tsvHeaders } = parseTSV(text)
          headers = tsvHeaders
        } else {
          // CSV, TXT, or other delimited files
          const { headers: csvHeaders } = parseExcelCSV(text)
          headers = csvHeaders
        }
      }

      // Auto-detect field mappings
      const autoMapping: Record<string, string> = {}
      headers.forEach(header => {
        const lowerHeader = header.toLowerCase()
        if (lowerHeader.includes('name') || lowerHeader.includes('full')) {
          autoMapping['name'] = header
        } else if (lowerHeader.includes('email') || lowerHeader.includes('mail')) {
          autoMapping['email'] = header
        } else if (lowerHeader.includes('phone') || lowerHeader.includes('mobile') || lowerHeader.includes('tel')) {
          autoMapping['phone'] = header
        } else if (lowerHeader.includes('address') || lowerHeader.includes('street')) {
          autoMapping['address'] = header
        } else if (lowerHeader.includes('suburb')) {
          autoMapping['suburb'] = header
        } else if (lowerHeader.includes('city')) {
          autoMapping['city'] = header
        } else if (lowerHeader.includes('postal') || lowerHeader.includes('zip') || lowerHeader.includes('postcode')) {
          autoMapping['postal_code'] = header
        } else if (lowerHeader.includes('note') || lowerHeader.includes('comment')) {
          autoMapping['notes'] = header
        } else if (lowerHeader.includes('tag')) {
          autoMapping['tags'] = header
        }
      })

      setFieldMapping(autoMapping)
      setStep('mapping')
    } catch (error) {
      setErrors(['Error reading CSV file. Please check the format.'])
    }
  }

  const generatePreview = async () => {
    if (!file) return

    try {
      const { headers, rows } = await parseFile(file)

      const contacts: ImportContact[] = rows.slice(0, 5).map(row => {
        const contact: any = {}

        Object.entries(fieldMapping).forEach(([field, csvHeader]) => {
          const headerIndex = headers.indexOf(csvHeader)
          if (headerIndex !== -1) {
            let value = row[headerIndex]?.trim()
            if (field === 'tags' && value) {
              contact[field] = value.split(';').map((tag: string) => tag.trim()).filter((tag: string) => tag)
            } else if (value) {
              contact[field] = value
            }
          }
        })

        return contact
      })

      // Validate required fields
      const validationErrors: string[] = []
      contacts.forEach((contact, index) => {
        requiredFields.forEach(field => {
          if (!contact[field]) {
            validationErrors.push(`Row ${index + 2}: Missing required field '${field}'`)
          }
        })
      })

      setErrors(validationErrors)
      setPreview(contacts)
      setStep('preview')
    } catch (error) {
      setErrors(['Error generating preview'])
    }
  }

  const handleImport = async () => {
    if (!file) return

    setImporting(true)
    try {
      const { headers, rows } = await parseFile(file)

      const contacts: ImportContact[] = []
      const importErrors: string[] = []

      // Process all rows
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const contact: any = {}

        Object.entries(fieldMapping).forEach(([field, csvHeader]) => {
          const headerIndex = headers.indexOf(csvHeader)
          if (headerIndex !== -1) {
            let value = row[headerIndex]?.trim()
            if (field === 'tags' && value) {
              contact[field] = value.split(';').map((tag: string) => tag.trim()).filter((tag: string) => tag)
            } else if (value) {
              contact[field] = value
            }
          }
        })

        // Validate required fields
        const hasRequiredFields = requiredFields.every(field => contact[field])
        if (hasRequiredFields) {
          contacts.push(contact)
        } else {
          importErrors.push(`Row ${i + 2}: Missing required fields`)
        }
      }

      if (contacts.length === 0) {
        setErrors(['No valid contacts found to import'])
        return
      }

      // Import contacts to database
      let successCount = 0
      for (const contact of contacts) {
        try {
          // Construct complete address for accurate geocoding
          const fullAddress = [
            contact.address,
            contact.suburb,
            contact.city,
            contact.postal_code,
            'New Zealand'
          ].filter(Boolean).join(', ')

          console.log('Geocoding imported contact address:', fullAddress)
          const coordinates = await geocode(fullAddress)

          const contactData = {
            name: contact.name,
            email: contact.email || null,
            phone: contact.phone || null,
            address: contact.address,
            suburb: contact.suburb || null,
            city: contact.city || null,
            postal_code: contact.postal_code || null,
            notes: contact.notes || null,
            tags: contact.tags || null,
            lat: coordinates.lat,
            lng: coordinates.lng,
            contact_source: 'import' as const,
            user_id: user?.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          const { error } = await supabase
            .from('contacts')
            .insert([contactData])

          if (!error) {
            successCount++
          }
        } catch (error) {
          console.error('Error importing contact:', contact.name, error)
        }
      }

      onImportComplete(successCount)
    } catch (error) {
      setErrors(['Error during import process'])
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const csvContent = 'Name,Email,Phone,Address,Suburb,City,Postal Code,Notes,Tags\n' +
      'John Smith,john@example.com,+64 21 123 4567,123 Queen Street,CBD,Auckland,1010,First time buyer,buyer;motivated\n' +
      'Jane Doe,jane@example.com,+64 21 987 6543,456 Ponsonby Road,Ponsonby,Auckland,1011,Investor interested in apartments,investor;repeat-client'

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'contact-import-template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Import Contacts from CSV</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step === 'upload' ? 'bg-primary-600 text-white' : step === 'mapping' || step === 'preview' ? 'bg-green-600 text-white' : 'bg-gray-300'}`}>
                {step === 'upload' ? '1' : '✓'}
              </div>
              <div className={`flex-1 h-1 mx-2 ${step === 'mapping' || step === 'preview' ? 'bg-green-600' : 'bg-gray-300'}`}></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step === 'mapping' ? 'bg-primary-600 text-white' : step === 'preview' ? 'bg-green-600 text-white' : 'bg-gray-300'}`}>
                {step === 'preview' ? '✓' : '2'}
              </div>
              <div className={`flex-1 h-1 mx-2 ${step === 'preview' ? 'bg-green-600' : 'bg-gray-300'}`}></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step === 'preview' ? 'bg-primary-600 text-white' : 'bg-gray-300'}`}>
                3
              </div>
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-600">
              <span>Upload File</span>
              <span>Map Fields</span>
              <span>Import</span>
            </div>
          </div>

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  <div className="mt-4">
                    <label htmlFor="csv-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Click to upload file
                      </span>
                      <input
                        id="csv-upload"
                        type="file"
                        accept=".csv,.tsv,.txt,.xlsx"
                        onChange={handleFileUpload}
                        className="sr-only"
                      />
                    </label>
                    <p className="mt-2 text-sm text-gray-600">
                      Upload a CSV, TSV, TXT, or Excel (.xlsx) file with contact information
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Supported File Formats:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>CSV files:</strong> Comma-separated values (.csv)</li>
                  <li>• <strong>TSV files:</strong> Tab-separated values (.tsv)</li>
                  <li>• <strong>Text files:</strong> Delimited text files (.txt)</li>
                  <li>• <strong>Excel files:</strong> Excel workbook files (.xlsx) - Export as CSV for now</li>
                </ul>
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="font-medium text-blue-900 mb-1">Format Requirements:</p>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• <strong>Required fields:</strong> Name, Address</li>
                    <li>• <strong>Optional fields:</strong> Email, Phone, Suburb, City, Postal Code, Notes</li>
                    <li>• <strong>Tags:</strong> Separate multiple tags with semicolons (;)</li>
                    <li>• First row should contain column headers</li>
                  </ul>
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={downloadTemplate}
                  className="btn-secondary"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Template
                </button>
              </div>

              {file && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800">
                    <strong>File selected:</strong> {file.name}
                  </p>
                  <button
                    onClick={() => setStep('mapping')}
                    className="mt-2 btn-primary"
                  >
                    Continue to Field Mapping
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Field Mapping */}
          {step === 'mapping' && file && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Map CSV columns to contact fields</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allFields.map(field => (
                    <div key={field}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.charAt(0).toUpperCase() + field.slice(1).replace('_', ' ')}
                        {requiredFields.includes(field) && ' *'}
                      </label>
                      <select
                        value={fieldMapping[field] || ''}
                        onChange={(e) => setFieldMapping(prev => ({ ...prev, [field]: e.target.value }))}
                        className="input-field"
                      >
                        <option value="">Select column...</option>
                        {Object.keys(fieldMapping).length > 0 &&
                          Object.values(new Set(Object.values(fieldMapping))).map(header => (
                            <option key={header} value={header}>{header}</option>
                          ))
                        }
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setStep('upload')}
                  className="btn-secondary"
                >
                  Back
                </button>
                <button
                  onClick={generatePreview}
                  className="btn-primary"
                  disabled={!fieldMapping.name || !fieldMapping.address}
                >
                  Generate Preview
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Preview & Import */}
          {step === 'preview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Preview (first 5 contacts)</h3>
                {preview.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {preview.map((contact, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{contact.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contact.email || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contact.phone || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contact.address}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setStep('mapping')}
                  className="btn-secondary"
                  disabled={importing}
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  className="btn-primary"
                  disabled={importing || errors.length > 0}
                >
                  {importing ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Importing...
                    </div>
                  ) : (
                    'Import Contacts'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-800 mb-2">Issues found:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {errors.slice(0, 10).map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
                {errors.length > 10 && (
                  <li>• ... and {errors.length - 10} more errors</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
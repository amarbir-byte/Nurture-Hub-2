import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

interface ImportProperty {
  address: string
  status?: 'listed' | 'sold' | 'withdrawn'
  price?: number
  bedrooms?: number
  bathrooms?: number
  property_type?: 'house' | 'apartment' | 'townhouse' | 'land' | 'commercial'
  description?: string
  listing_date?: string
  sold_date?: string
  [key: string]: any
}

interface PropertyImportProps {
  onImportComplete: (importedCount: number) => void
  onClose: () => void
}

export function PropertyImport({ onImportComplete, onClose }: PropertyImportProps) {
  const { user } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload')
  const [headers, setHeaders] = useState<string[]>([])
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState<ImportProperty[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [importing, setImporting] = useState(false)

  const requiredFields = ['address']
  const optionalFields = ['status', 'price', 'bedrooms', 'bathrooms', 'property_type', 'description', 'listing_date', 'sold_date']
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
    const lines = csvText.split('\n').filter(line => line.trim())
    if (lines.length === 0) throw new Error('File is empty')

    const firstLine = lines[0]
    const delimiter = firstLine.includes(';') ? ';' : ','

    const headers = firstLine.split(delimiter).map(h => h.trim().replace(/"/g, ''))
    const rows = lines.slice(1).map(line => {
      return line.split(delimiter).map(cell => cell.trim().replace(/"/g, ''))
    })

    return { headers, rows }
  }

  const parseExcelFile = async (_arrayBuffer: ArrayBuffer): Promise<{ headers: string[], rows: string[][] }> => {
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
      const { headers } = await parseFile(selectedFile)

      const autoMapping: Record<string, string> = {}
      headers.forEach(header => {
        const lowerHeader = header.toLowerCase()
        if (lowerHeader.includes('address')) {
          autoMapping['address'] = header
        } else if (lowerHeader.includes('status')) {
          autoMapping['status'] = header
        } else if (lowerHeader.includes('price') || lowerHeader.includes('cost')) {
          autoMapping['price'] = header
        } else if (lowerHeader.includes('bedroom') || lowerHeader.includes('bed')) {
          autoMapping['bedrooms'] = header
        } else if (lowerHeader.includes('bathroom') || lowerHeader.includes('bath')) {
          autoMapping['bathrooms'] = header
        } else if (lowerHeader.includes('type') || lowerHeader.includes('property_type')) {
          autoMapping['property_type'] = header
        } else if (lowerHeader.includes('description') || lowerHeader.includes('desc')) {
          autoMapping['description'] = header
        } else if (lowerHeader.includes('listing') || lowerHeader.includes('list_date')) {
          autoMapping['listing_date'] = header
        } else if (lowerHeader.includes('sold') || lowerHeader.includes('sale_date')) {
          autoMapping['sold_date'] = header
        }
      })

      setHeaders(headers)
      setFieldMapping(autoMapping)
      setStep('mapping')
    } catch (error) {
      setErrors(['Error reading file. Please check the format.'])
    }
  }

  const downloadTemplate = () => {
    const csvContent = 'Address,Status,Price,Bedrooms,Bathrooms,Property Type,Description,Listing Date,Sold Date\n' +
      '123 Main Street Auckland,listed,750000,3,2,house,Beautiful family home,2024-01-15,\n' +
      '456 Queen Street Wellington,sold,950000,4,3,townhouse,Modern townhouse,2024-01-10,2024-02-15'

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'property_import_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const generatePreview = async () => {
    if (!file) return

    try {
      const { headers, rows } = await parseFile(file)

      const properties: ImportProperty[] = rows.slice(0, 5).map(row => {
        const property: any = {}

        Object.entries(fieldMapping).forEach(([field, csvHeader]) => {
          const headerIndex = headers.indexOf(csvHeader)
          if (headerIndex !== -1) {
            let value = row[headerIndex]?.trim()
            if (value) {
              if (field === 'price' || field === 'bedrooms' || field === 'bathrooms') {
                const numValue = parseFloat(value)
                if (!isNaN(numValue)) {
                  property[field] = numValue
                }
              } else {
                property[field] = value
              }
            }
          }
        })

        return property
      })

      const validationErrors: string[] = []
      properties.forEach((property, index) => {
        requiredFields.forEach(field => {
          if (!property[field]) {
            validationErrors.push(`Row ${index + 2}: Missing required field '${field}'`)
          }
        })
      })

      setErrors(validationErrors)
      setPreview(properties)
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

      const properties: ImportProperty[] = []
      const importErrors: string[] = []

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const property: any = {}

        Object.entries(fieldMapping).forEach(([field, csvHeader]) => {
          const headerIndex = headers.indexOf(csvHeader)
          if (headerIndex !== -1) {
            let value = row[headerIndex]?.trim()
            if (value) {
              if (field === 'price' || field === 'bedrooms' || field === 'bathrooms') {
                const numValue = parseFloat(value)
                if (!isNaN(numValue)) {
                  property[field] = numValue
                }
              } else {
                property[field] = value
              }
            }
          }
        })

        // Validate required fields
        const missingFields = requiredFields.filter(field => !property[field])
        if (missingFields.length > 0) {
          importErrors.push(`Row ${i + 2}: Missing required fields: ${missingFields.join(', ')}`)
          continue
        }

        // Set defaults
        if (!property.status) property.status = 'listed'
        if (!property.property_type) property.property_type = 'house'

        // Mock geocoding
        const { lat, lng } = await mockGeocode(property.address)
        property.lat = lat
        property.lng = lng

        properties.push(property)
      }

      if (importErrors.length > 0) {
        setErrors(importErrors)
        setImporting(false)
        return
      }

      // Insert properties into database
      const propertiesWithUser = properties.map(property => ({
        ...property,
        user_id: user?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))

      const { error } = await supabase
        .from('properties')
        .insert(propertiesWithUser)

      if (error) throw error

      onImportComplete(properties.length)
      onClose()
    } catch (error) {
      console.error('Error importing properties:', error)
      setErrors(['Error importing properties. Please try again.'])
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Import Properties</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-md"
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
                    <label htmlFor="property-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Click to upload file
                      </span>
                      <input
                        id="property-upload"
                        type="file"
                        accept=".csv,.tsv,.txt,.xlsx"
                        onChange={handleFileUpload}
                        className="sr-only"
                      />
                    </label>
                    <p className="mt-2 text-sm text-gray-600">
                      Upload a CSV, TSV, TXT, or Excel (.xlsx) file with property information
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
                    <li>• <strong>Required field:</strong> Address</li>
                    <li>• <strong>Optional fields:</strong> Status, Price, Bedrooms, Bathrooms, Property Type, Description, Listing Date, Sold Date</li>
                    <li>• <strong>Status values:</strong> listed, sold, withdrawn</li>
                    <li>• <strong>Property types:</strong> house, apartment, townhouse, land, commercial</li>
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
                    className="mt-3 btn-primary"
                  >
                    Continue to Field Mapping
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Field Mapping */}
          {step === 'mapping' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Map CSV Fields to Property Data</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Match the columns in your file to the property fields below. Required fields are marked with *.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allFields.map((field) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.charAt(0).toUpperCase() + field.slice(1).replace('_', ' ')}
                      {requiredFields.includes(field) && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <select
                      value={fieldMapping[field] || ''}
                      onChange={(e) => setFieldMapping(prev => ({ ...prev, [field]: e.target.value }))}
                      className="input-field"
                    >
                      <option value="">Select column</option>
                      {headers.map((header) => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep('upload')}
                  className="btn-secondary"
                >
                  Back
                </button>
                <button
                  onClick={generatePreview}
                  className="btn-primary"
                  disabled={!fieldMapping.address}
                >
                  Generate Preview
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Preview Import</h3>
                <p className="text-sm text-gray-600">
                  Review the first 5 properties that will be imported. Check the data is correct before proceeding.
                </p>
              </div>

              {preview.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Beds/Baths</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {preview.map((property, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900">{property.address}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{property.status || 'listed'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {property.price ? `$${property.price.toLocaleString()}` : '-'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">{property.property_type || 'house'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {property.bedrooms || '-'} / {property.bathrooms || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-between">
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
                  {importing ? 'Importing...' : `Import ${preview.length} Properties`}
                </button>
              </div>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-900 mb-2">Please fix the following issues:</h4>
              <ul className="text-sm text-red-800 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
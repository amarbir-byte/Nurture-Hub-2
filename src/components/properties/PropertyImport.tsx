import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

interface ImportProperty {
  // Core address fields
  address?: string
  street_number?: string
  street?: string
  suburb?: string

  // Price and sale information
  sale_price?: number
  list_price?: number
  price?: number // legacy field for backward compatibility

  // Date fields
  sale_date?: string
  settlement_date?: string
  agreement_date?: string
  listing_date?: string
  sold_date?: string // legacy field

  // Property details
  bedrooms?: number
  bathrooms?: number
  floor_area?: number
  land_area_ha?: number
  land_area_m2?: number
  property_type?: 'house' | 'apartment' | 'townhouse' | 'land' | 'commercial'

  // Sale details
  days_to_sell?: number
  sale_category?: string
  sale_method?: string
  status?: 'listed' | 'sold' | 'withdrawn'

  // Additional fields
  valuation?: number
  organisation?: string
  new_dwelling?: boolean
  sale_tenure?: string
  description?: string

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

  // Core REINZ fields
  const reinzFields = [
    'street_number', 'street', 'suburb', 'sale_price', 'sale_date', 'list_price',
    'settlement_date', 'agreement_date', 'days_to_sell', 'sale_category', 'sale_method',
    'valuation', 'organisation', 'bedrooms', 'floor_area', 'land_area_ha', 'land_area_m2',
    'new_dwelling', 'sale_tenure'
  ]

  // Legacy fields for backward compatibility
  const legacyFields = ['address', 'status', 'price', 'bathrooms', 'property_type', 'description', 'listing_date', 'sold_date']

  const requiredFields = ['address'] // At minimum need address or street components

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
        const lowerHeader = header.toLowerCase().replace(/\s+/g, '_')
        const originalLower = header.toLowerCase()

        // REINZ-specific field mappings (exact matches first)
        if (lowerHeader === 'street_number') {
          autoMapping['street_number'] = header
        } else if (lowerHeader === 'street') {
          autoMapping['street'] = header
        } else if (lowerHeader === 'suburb') {
          autoMapping['suburb'] = header
        } else if (lowerHeader === 'sale_price') {
          autoMapping['sale_price'] = header
        } else if (lowerHeader === 'sale_date') {
          autoMapping['sale_date'] = header
        } else if (lowerHeader === 'list_price') {
          autoMapping['list_price'] = header
        } else if (lowerHeader === 'settlement_date') {
          autoMapping['settlement_date'] = header
        } else if (lowerHeader === 'agreement_date') {
          autoMapping['agreement_date'] = header
        } else if (lowerHeader === 'days_to_sell') {
          autoMapping['days_to_sell'] = header
        } else if (lowerHeader === 'sale_category') {
          autoMapping['sale_category'] = header
        } else if (lowerHeader === 'sale_method') {
          autoMapping['sale_method'] = header
        } else if (lowerHeader === 'valuation') {
          autoMapping['valuation'] = header
        } else if (lowerHeader === 'organisation') {
          autoMapping['organisation'] = header
        } else if (lowerHeader === 'bedrooms') {
          autoMapping['bedrooms'] = header
        } else if (lowerHeader === 'floor_area') {
          autoMapping['floor_area'] = header
        } else if (lowerHeader === 'land_area_ha') {
          autoMapping['land_area_ha'] = header
        } else if (lowerHeader === 'land_area_m2') {
          autoMapping['land_area_m2'] = header
        } else if (lowerHeader === 'new_dwelling') {
          autoMapping['new_dwelling'] = header
        } else if (lowerHeader === 'sale_tenure') {
          autoMapping['sale_tenure'] = header

        // Fuzzy matching for common variations
        } else if (originalLower.includes('address')) {
          autoMapping['address'] = header
        } else if (originalLower.includes('status')) {
          autoMapping['status'] = header
        } else if (originalLower.includes('price') && !autoMapping['sale_price'] && !autoMapping['list_price']) {
          // Default price field if no specific price fields matched
          autoMapping['price'] = header
        } else if (originalLower.includes('bedroom') || originalLower.includes('bed')) {
          if (!autoMapping['bedrooms']) autoMapping['bedrooms'] = header
        } else if (originalLower.includes('bathroom') || originalLower.includes('bath')) {
          autoMapping['bathrooms'] = header
        } else if (originalLower.includes('type') || originalLower.includes('property_type')) {
          autoMapping['property_type'] = header
        } else if (originalLower.includes('description') || originalLower.includes('desc')) {
          autoMapping['description'] = header
        } else if (originalLower.includes('listing') || originalLower.includes('list_date')) {
          if (!autoMapping['list_price']) autoMapping['listing_date'] = header
        } else if (originalLower.includes('sold') && !autoMapping['sale_date']) {
          autoMapping['sold_date'] = header
        }
      })

      // Create composite address if we have street components but no address
      if (!autoMapping['address'] && (autoMapping['street_number'] || autoMapping['street'] || autoMapping['suburb'])) {
        // We'll handle address composition in the processing step
        autoMapping['address'] = 'COMPOSITE'
      }

      setHeaders(headers)
      setFieldMapping(autoMapping)
      setStep('mapping')
    } catch (error) {
      setErrors(['Error reading file. Please check the format.'])
    }
  }

  const downloadTemplate = () => {
    // REINZ-style template with comprehensive fields
    const csvContent = 'Street Number,Street,Suburb,Sale Price,Sale Date,List Price,Settlement Date,Agreement Date,Days To Sell,Sale Category,Sale Method,Valuation,Organisation,Bedrooms,Floor Area,Land Area ha,Land Area m2,New Dwelling,Sale Tenure\n' +
      '123,Main Street,Auckland,750000,2024-02-15,695000,2024-03-15,2024-01-20,26,Normal Sale,Auction,780000,Barfoot & Thompson,3,120,0.06,600,No,Freehold\n' +
      '456,Queen Street,Wellington,950000,2024-02-10,925000,2024-03-10,2024-01-25,16,Normal Sale,Private Treaty,970000,Ray White,4,150,0.08,800,Yes,Freehold'

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'reinz_property_import_template.csv'
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

        // Handle composite address creation
        if (fieldMapping['address'] === 'COMPOSITE') {
          const addressParts = []
          if (fieldMapping['street_number']) {
            const streetNumIndex = headers.indexOf(fieldMapping['street_number'])
            if (streetNumIndex !== -1 && row[streetNumIndex]?.trim()) {
              const cleanValue = row[streetNumIndex].trim().replace(/^=+/, '').replace(/["""]/g, '"')
              addressParts.push(cleanValue)
            }
          }
          if (fieldMapping['street']) {
            const streetIndex = headers.indexOf(fieldMapping['street'])
            if (streetIndex !== -1 && row[streetIndex]?.trim()) {
              const cleanValue = row[streetIndex].trim().replace(/^=+/, '').replace(/["""]/g, '"')
              addressParts.push(cleanValue)
            }
          }
          if (fieldMapping['suburb']) {
            const suburbIndex = headers.indexOf(fieldMapping['suburb'])
            if (suburbIndex !== -1 && row[suburbIndex]?.trim()) {
              const cleanValue = row[suburbIndex].trim().replace(/^=+/, '').replace(/["""]/g, '"')
              addressParts.push(cleanValue)
            }
          }
          if (addressParts.length > 0) {
            property.address = addressParts.join(' ')
          }
        }

        Object.entries(fieldMapping).forEach(([field, csvHeader]) => {
          if (csvHeader === 'COMPOSITE') return // Skip composite fields, handled above

          const headerIndex = headers.indexOf(csvHeader)
          if (headerIndex !== -1) {
            let value = row[headerIndex]?.trim()
            if (value) {
              // Numeric fields
              if (['price', 'sale_price', 'list_price', 'valuation', 'bedrooms', 'bathrooms', 'floor_area', 'land_area_m2', 'days_to_sell'].includes(field)) {
                const numValue = parseFloat(value.replace(/[=,$"]/g, '')) // Remove =, commas, dollar signs, and quotes
                if (!isNaN(numValue)) {
                  property[field] = numValue
                }
              } else if (field === 'land_area_ha') {
                const numValue = parseFloat(value.replace(/[=,$"]/g, ''))
                if (!isNaN(numValue)) {
                  property[field] = numValue
                }
              } else if (field === 'new_dwelling') {
                // Convert to boolean
                property[field] = value.toLowerCase() === 'yes' || value.toLowerCase() === 'true' || value === '1'
              } else {
                // Clean up text fields by removing Excel formatting characters
                property[field] = value.replace(/^=+/, '').replace(/["""]/g, '"')
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

        // Handle composite address creation
        if (fieldMapping['address'] === 'COMPOSITE') {
          const addressParts = []
          if (fieldMapping['street_number']) {
            const streetNumIndex = headers.indexOf(fieldMapping['street_number'])
            if (streetNumIndex !== -1 && row[streetNumIndex]?.trim()) {
              const cleanValue = row[streetNumIndex].trim().replace(/^=+/, '').replace(/["""]/g, '"')
              addressParts.push(cleanValue)
            }
          }
          if (fieldMapping['street']) {
            const streetIndex = headers.indexOf(fieldMapping['street'])
            if (streetIndex !== -1 && row[streetIndex]?.trim()) {
              const cleanValue = row[streetIndex].trim().replace(/^=+/, '').replace(/["""]/g, '"')
              addressParts.push(cleanValue)
            }
          }
          if (fieldMapping['suburb']) {
            const suburbIndex = headers.indexOf(fieldMapping['suburb'])
            if (suburbIndex !== -1 && row[suburbIndex]?.trim()) {
              const cleanValue = row[suburbIndex].trim().replace(/^=+/, '').replace(/["""]/g, '"')
              addressParts.push(cleanValue)
            }
          }
          if (addressParts.length > 0) {
            property.address = addressParts.join(' ')
          }
        }

        Object.entries(fieldMapping).forEach(([field, csvHeader]) => {
          if (csvHeader === 'COMPOSITE') return // Skip composite fields, handled above

          const headerIndex = headers.indexOf(csvHeader)
          if (headerIndex !== -1) {
            let value = row[headerIndex]?.trim()
            if (value) {
              // Numeric fields
              if (['price', 'sale_price', 'list_price', 'valuation', 'bedrooms', 'bathrooms', 'floor_area', 'land_area_m2', 'days_to_sell'].includes(field)) {
                const numValue = parseFloat(value.replace(/[=,$"]/g, '')) // Remove =, commas, dollar signs, and quotes
                if (!isNaN(numValue)) {
                  property[field] = numValue
                }
              } else if (field === 'land_area_ha') {
                const numValue = parseFloat(value.replace(/[=,$"]/g, ''))
                if (!isNaN(numValue)) {
                  property[field] = numValue
                }
              } else if (field === 'new_dwelling') {
                // Convert to boolean
                property[field] = value.toLowerCase() === 'yes' || value.toLowerCase() === 'true' || value === '1'
              } else {
                // Clean up text fields by removing Excel formatting characters
                property[field] = value.replace(/^=+/, '').replace(/["""]/g, '"')
              }
            }
          }
        })

        // Validate required fields - need at least an address or address components
        const hasAddress = property.address || (property.street_number && property.street) || property.street || property.suburb
        if (!hasAddress) {
          importErrors.push(`Row ${i + 2}: Missing address information (need address or street/suburb)`)
          continue
        }

        // If we have individual components but no composite address, create one
        if (!property.address && (property.street_number || property.street || property.suburb)) {
          const addressParts = [property.street_number, property.street, property.suburb].filter(Boolean)
          property.address = addressParts.join(' ')
        }

        // Set defaults and normalize data
        if (!property.status) {
          property.status = property.sale_date || property.sale_price ? 'sold' : 'listed'
        }
        if (!property.property_type) property.property_type = 'house'

        // Use sale_price as primary price if available
        if (!property.price && property.sale_price) {
          property.price = property.sale_price
        } else if (!property.price && property.list_price) {
          property.price = property.list_price
        }

        // Use sale_date as sold_date for backward compatibility
        if (!property.sold_date && property.sale_date) {
          property.sold_date = property.sale_date
        }

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

      // Insert properties into database with all enhanced REINZ fields
      const propertiesWithUser = properties.map(property => ({
        // Core fields
        address: property.address,
        status: property.status || 'listed',
        price: property.price || property.sale_price || property.list_price,
        property_type: property.property_type || 'house',
        lat: property.lat,
        lng: property.lng,
        user_id: user?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),

        // Address components
        street_number: property.street_number,
        street: property.street,
        suburb: property.suburb,

        // Pricing
        sale_price: property.sale_price,
        list_price: property.list_price,
        valuation: property.valuation,

        // Property details
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        description: property.description,
        floor_area: property.floor_area,
        land_area_ha: property.land_area_ha,
        land_area_m2: property.land_area_m2,

        // Dates
        listing_date: property.listing_date,
        sold_date: property.sold_date || property.sale_date,
        sale_date: property.sale_date,
        settlement_date: property.settlement_date,
        agreement_date: property.agreement_date,

        // Sale information
        days_to_sell: property.days_to_sell,
        sale_category: property.sale_category,
        sale_method: property.sale_method,
        organisation: property.organisation,

        // Property characteristics
        new_dwelling: property.new_dwelling,
        sale_tenure: property.sale_tenure,
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
                  <p className="font-medium text-blue-900 mb-1">REINZ Export Format Support:</p>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• <strong>Address:</strong> Street Number, Street, Suburb (or combined Address field)</li>
                    <li>• <strong>Pricing:</strong> Sale Price, List Price, Valuation</li>
                    <li>• <strong>Dates:</strong> Sale Date, Settlement Date, Agreement Date, Listing Date</li>
                    <li>• <strong>Property Details:</strong> Bedrooms, Floor Area, Land Area (ha/m²)</li>
                    <li>• <strong>Sale Info:</strong> Days To Sell, Sale Category, Sale Method, Organisation</li>
                    <li>• <strong>Additional:</strong> New Dwelling (Yes/No), Sale Tenure</li>
                  </ul>
                  <div className="mt-2 pt-2 border-t border-blue-200">
                    <p className="text-xs text-blue-700">Auto-detects REINZ export format and standard property CSV files</p>
                  </div>
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

              {/* REINZ Fields Section */}
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-800 mb-3">REINZ Export Fields</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {reinzFields.map((field) => (
                    <div key={field}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ')}
                      </label>
                      <select
                        value={fieldMapping[field] || ''}
                        onChange={(e) => setFieldMapping(prev => ({ ...prev, [field]: e.target.value }))}
                        className="input-field text-sm"
                      >
                        <option value="">Select column</option>
                        {headers.map((header) => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Legacy/Standard Fields Section */}
              <div>
                <h4 className="text-md font-medium text-gray-800 mb-3">Standard Property Fields</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {legacyFields.map((field) => (
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
                        <option value="COMPOSITE">Create from Street + Suburb</option>
                        {headers.map((header) => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
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
                  disabled={!fieldMapping.address && !fieldMapping.street && !fieldMapping.suburb}
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
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sale Price</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sale Date</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bedrooms</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Area</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Days to Sell</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {preview.map((property, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2 text-sm text-gray-900">{property.address}</td>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            {property.sale_price ? `$${property.sale_price.toLocaleString()}` :
                             property.price ? `$${property.price.toLocaleString()}` : '-'}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900">{property.sale_date || property.sold_date || '-'}</td>
                          <td className="px-3 py-2 text-sm text-gray-900">{property.bedrooms || '-'}</td>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            {property.floor_area ? `${property.floor_area}m²` :
                             property.land_area_m2 ? `${property.land_area_m2}m² land` :
                             property.land_area_ha ? `${property.land_area_ha}ha` : '-'}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900">{property.days_to_sell || '-'}</td>
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
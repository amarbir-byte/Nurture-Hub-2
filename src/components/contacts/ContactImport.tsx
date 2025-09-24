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
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])

  const requiredFields = ['name', 'address']
  const optionalFields = ['email', 'phone', 'suburb', 'city', 'postal_code', 'notes', 'tags']
  const allFields = [...requiredFields, ...optionalFields]

  // const mockGeocode = async (_address: string) => {
  //   const nzCities = [
  //     { name: 'Auckland', lat: -36.8485, lng: 174.7633 },
  //     { name: 'Wellington', lat: -41.2865, lng: 174.7762 },
  //     { name: 'Christchurch', lat: -43.5321, lng: 172.6362 },
  //     { name: 'Hamilton', lat: -37.7870, lng: 175.2793 },
  //     { name: 'Tauranga', lat: -37.6878, lng: 176.1651 },
  //   ]

  //   const randomCity = nzCities[Math.floor(Math.random() * nzCities.length)]
  //   return {
  //     lat: randomCity.lat + (Math.random() - 0.5) * 0.1,
  //     lng: randomCity.lng + (Math.random() - 0.5) * 0.1,
  //   }
  // }


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

  // Enhanced column detection with fuzzy matching
  const detectColumnType = (header: string): { field: string; confidence: number } => {
    const lowerHeader = header.toLowerCase().trim()
    
    // Exact matches (highest confidence)
    const exactMatches: Record<string, string[]> = {
      'name': ['name', 'full name', 'fullname', 'contact name', 'client name', 'customer name'],
      'email': ['email', 'e-mail', 'email address', 'mail'],
      'phone': ['phone', 'mobile', 'cell', 'telephone', 'tel', 'contact number', 'phone number'],
      'address': ['address', 'street address', 'full address', 'property address'],
      'street_number': ['street number', 'house number', 'number', 'street no', 'house no'],
      'street_name': ['street name', 'street', 'road', 'avenue', 'drive', 'lane', 'crescent'],
      'suburb': ['suburb', 'area', 'district', 'neighborhood', 'neighbourhood'],
      'city': ['city', 'town', 'municipality'],
      'postal_code': ['postal code', 'postcode', 'zip code', 'zip', 'pincode'],
      'notes': ['notes', 'comments', 'remarks', 'description', 'additional info'],
      'tags': ['tags', 'categories', 'labels', 'groups']
    }

    // Check exact matches first
    for (const [field, variations] of Object.entries(exactMatches)) {
      if (variations.some(variation => lowerHeader === variation)) {
        return { field, confidence: 1.0 }
      }
    }

    // Fuzzy matching for partial matches
    const fuzzyMatches: Record<string, string[]> = {
      'name': ['name', 'full', 'contact', 'client', 'customer', 'person'],
      'email': ['email', 'mail', '@'],
      'phone': ['phone', 'mobile', 'cell', 'tel', 'contact', 'number'],
      'address': ['address', 'street', 'property', 'location'],
      'street_number': ['number', 'no', 'house'],
      'street_name': ['street', 'road', 'avenue', 'drive', 'lane', 'crescent', 'way', 'place'],
      'suburb': ['suburb', 'area', 'district', 'neighborhood'],
      'city': ['city', 'town', 'municipality'],
      'postal_code': ['postal', 'postcode', 'zip', 'pin'],
      'notes': ['note', 'comment', 'remark', 'description', 'info'],
      'tags': ['tag', 'category', 'label', 'group']
    }

    let bestMatch = { field: '', confidence: 0 }
    
    for (const [field, keywords] of Object.entries(fuzzyMatches)) {
      const matchCount = keywords.filter(keyword => lowerHeader.includes(keyword)).length
      const confidence = matchCount / keywords.length
      
      if (confidence > bestMatch.confidence && confidence > 0.3) {
        bestMatch = { field, confidence }
      }
    }

    return bestMatch
  }

  // Intelligent address parsing
  const parseAddressComponents = (addressString: string): {
    street_number?: string
    street_name?: string
    suburb?: string
    city?: string
    postal_code?: string
  } => {
    if (!addressString) return {}

    const address = addressString.trim()
    const components: any = {}

    // Extract postal code (NZ format: 4 digits)
    const postalMatch = address.match(/\b(\d{4})\b/)
    if (postalMatch) {
      components.postal_code = postalMatch[1]
    }

    // Extract street number (at the beginning)
    const numberMatch = address.match(/^(\d+[a-zA-Z]?)\s+/)
    if (numberMatch) {
      components.street_number = numberMatch[1]
    }

    // Common NZ city patterns
    const nzCities = [
      'Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Tauranga', 'Napier', 'Hastings',
      'Dunedin', 'Palmerston North', 'Nelson', 'Rotorua', 'New Plymouth', 'Whangarei',
      'Invercargill', 'Whanganui', 'Gisborne', 'Pukekohe', 'Timaru', 'Masterton'
    ]

    // Extract city
    for (const city of nzCities) {
      if (address.toLowerCase().includes(city.toLowerCase())) {
        components.city = city
        break
      }
    }

    // Extract suburb (common patterns)
    const suburbPatterns = [
      /,\s*([^,]+),\s*(?:Auckland|Wellington|Christchurch|Hamilton|Tauranga)/i,
      /,\s*([^,]+),\s*\d{4}/i,
      /,\s*([^,]+)$/i
    ]

    for (const pattern of suburbPatterns) {
      const match = address.match(pattern)
      if (match && match[1] && !match[1].match(/\d{4}/)) {
        components.suburb = match[1].trim()
        break
      }
    }

    // Extract street name (everything between number and suburb/city)
    let streetName = address
    if (components.street_number) {
      streetName = streetName.replace(new RegExp(`^${components.street_number}\\s+`), '')
    }
    if (components.suburb) {
      streetName = streetName.replace(new RegExp(`,\\s*${components.suburb}.*$`), '')
    }
    if (components.city) {
      streetName = streetName.replace(new RegExp(`,\\s*${components.city}.*$`), '')
    }
    if (components.postal_code) {
      streetName = streetName.replace(new RegExp(`,\\s*${components.postal_code}.*$`), '')
    }
    
    streetName = streetName.replace(/,\s*$/, '').trim()
    if (streetName && streetName !== address) {
      components.street_name = streetName
    }

    return components
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
      const { headers, rows } = await parseFile(selectedFile)

      // Enhanced auto-detection with confidence scoring
      const autoMapping: Record<string, string> = {}
      const columnDetections: Record<string, { field: string; confidence: number }> = {}

      // Detect column types for all headers
      headers.forEach(header => {
        const detection = detectColumnType(header)
        columnDetections[header] = detection
      })

      // Assign best matches (highest confidence wins)
      const usedFields = new Set<string>()
      const sortedDetections = Object.entries(columnDetections)
        .sort(([, a], [, b]) => b.confidence - a.confidence)

      for (const [header, detection] of sortedDetections) {
        if (detection.confidence > 0.3 && !usedFields.has(detection.field)) {
          autoMapping[detection.field] = header
          usedFields.add(detection.field)
        }
      }

      // Special handling for address components
      // If we have a full address but also separate components, prefer the components
      if (autoMapping.address && (autoMapping.street_number || autoMapping.street_name)) {
        // Keep the full address as fallback, but prioritize components
        console.log('Found both full address and components, will parse full address')
      }

      // If we have separate address components but no full address, create one
      if (!autoMapping.address && (autoMapping.street_number || autoMapping.street_name)) {
        // We'll construct the address from components during processing
        console.log('Found address components, will construct full address')
      }

      setFieldMapping(autoMapping)
      setCsvHeaders(headers)

      // Auto-generate preview if we have the minimum required fields
      if (autoMapping.name && (autoMapping.address || autoMapping.street_number || autoMapping.street_name)) {
        await generatePreviewFromMapping(headers, rows, autoMapping)
      } else {
        setStep('mapping')
      }
    } catch (error) {
      setErrors(['Error reading file. Please check the format.'])
      console.error('File parsing error:', error)
    }
  }

  // New function to generate preview directly from mapping
  const generatePreviewFromMapping = async (headers: string[], rows: string[][], mapping: Record<string, string>) => {
    try {
      const contacts: ImportContact[] = rows.slice(0, 5).map(row => {
        const contact: any = {}

        // Map basic fields
        Object.entries(mapping).forEach(([field, csvHeader]) => {
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

        // Handle address construction and parsing
        if (mapping.address && contact.address) {
          // Parse the full address into components
          const components = parseAddressComponents(contact.address)
          Object.assign(contact, components)
        } else if (mapping.street_number || mapping.street_name) {
          // Construct address from components
          const addressParts = [
            contact.street_number,
            contact.street_name,
            contact.suburb,
            contact.city,
            contact.postal_code
          ].filter(Boolean)
          
          contact.address = addressParts.join(', ')
        }

        return contact
      })

      // Validate required fields
      const validationErrors: string[] = []
      contacts.forEach((contact, index) => {
        if (!contact.name) {
          validationErrors.push(`Row ${index + 2}: Missing required field 'name'`)
        }
        if (!contact.address) {
          validationErrors.push(`Row ${index + 2}: Missing required field 'address'`)
        }
      })

      setErrors(validationErrors)
      setPreview(contacts)
      setStep('preview')
    } catch (error) {
      setErrors(['Error generating preview'])
      console.error('Preview generation error:', error)
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

        // Handle address construction and parsing
        if (fieldMapping.address && contact.address) {
          // Parse the full address into components
          const components = parseAddressComponents(contact.address)
          Object.assign(contact, components)
        } else if (fieldMapping.street_number || fieldMapping.street_name) {
          // Construct address from components
          const addressParts = [
            contact.street_number,
            contact.street_name,
            contact.suburb,
            contact.city,
            contact.postal_code
          ].filter(Boolean)
          
          contact.address = addressParts.join(', ')
        }

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
      'Jane Doe,jane@example.com,+64 21 987 6543,456 Ponsonby Road,Ponsonby,Auckland,1011,Investor interested in apartments,investor;repeat-client\n' +
      'Mike Johnson,mike@example.com,+64 21 555 1234,789 Main Street,Central,Wellington,6011,Looking for family home,family;first-home\n' +
      'Sarah Wilson,sarah@example.com,+64 21 777 8888,321 Victoria Street,Christchurch Central,Christchurch,8013,Downsizing,downsizer;cash-buyer'

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'contact-import-template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const downloadAdvancedTemplate = () => {
    const csvContent = 'Full Name,Email Address,Mobile Phone,Street Number,Street Name,Suburb,City,Postal Code,Comments,Category\n' +
      'John Smith,john@example.com,+64 21 123 4567,123,Queen Street,CBD,Auckland,1010,First time buyer,buyer;motivated\n' +
      'Jane Doe,jane@example.com,+64 21 987 6543,456,Ponsonby Road,Ponsonby,Auckland,1011,Investor interested in apartments,investor;repeat-client\n' +
      'Mike Johnson,mike@example.com,+64 21 555 1234,789,Main Street,Central,Wellington,6011,Looking for family home,family;first-home'

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'contact-import-advanced-template.csv'
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
                  <p className="font-medium text-blue-900 mb-1">Smart Import Features:</p>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• <strong>Auto-detection:</strong> Automatically maps columns to contact fields</li>
                    <li>• <strong>Address parsing:</strong> Handles both single address column and separate components</li>
                    <li>• <strong>Required fields:</strong> Name + Address (or Street Number/Name)</li>
                    <li>• <strong>Optional fields:</strong> Email, Phone, Suburb, City, Postal Code, Notes, Tags</li>
                    <li>• <strong>Flexible headers:</strong> Recognizes variations like "Full Name", "Email Address", etc.</li>
                    <li>• <strong>Tags:</strong> Separate multiple tags with semicolons (;)</li>
                  </ul>
                </div>
              </div>

              <div className="text-center space-y-3">
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={downloadTemplate}
                    className="btn-secondary"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Simple Template
                  </button>
                  <button
                    onClick={downloadAdvancedTemplate}
                    className="btn-secondary"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Advanced Template
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Simple: One address column • Advanced: Separate address components
                </p>
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
                <p className="text-sm text-gray-600 mb-4">
                  We've automatically detected some column mappings. Review and adjust as needed.
                </p>
                
                {/* Show detected mappings */}
                {Object.keys(fieldMapping).length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <h4 className="font-medium text-green-900 mb-2">Auto-detected mappings:</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(fieldMapping).map(([field, header]) => (
                        <div key={field} className="flex items-center">
                          <span className="font-medium text-green-800 capitalize">
                            {field.replace('_', ' ')}:
                          </span>
                          <span className="ml-2 text-green-700">{header}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allFields.map(field => (
                    <div key={field}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.charAt(0).toUpperCase() + field.slice(1).replace('_', ' ')}
                        {requiredFields.includes(field) && ' *'}
                        {fieldMapping[field] && (
                          <span className="ml-2 text-xs text-green-600">✓ Auto-detected</span>
                        )}
                      </label>
                      <select
                        value={fieldMapping[field] || ''}
                        onChange={(e) => setFieldMapping(prev => ({ ...prev, [field]: e.target.value }))}
                        className="input-field"
                      >
                        <option value="">Select column...</option>
                        {csvHeaders.map(header => (
                          <option key={header} value={header}>{header}</option>
                        ))}
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
                  disabled={!fieldMapping.name || (!fieldMapping.address && !fieldMapping.street_number && !fieldMapping.street_name)}
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
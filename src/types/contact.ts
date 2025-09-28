// Contact type definitions
export interface Contact {
  id: string
  user_id: string
  name: string // Legacy field - use first_name and last_name instead
  first_name?: string
  last_name?: string
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
  contact_type: 'buyer' | 'seller' | 'both'
  temperature: 'hot' | 'warm' | 'cold'
  tags?: string[]
  // Property purchase information (for sellers)
  property_purchase_date?: string
  property_purchase_price?: number
  property_address?: string
  property_suburb?: string
  property_city?: string
  property_postal_code?: string
  property_lat?: number
  property_lng?: number
  created_at: string
  updated_at: string
}

export type ContactType = 'buyer' | 'seller' | 'both'
export type ContactTemperature = 'hot' | 'warm' | 'cold'

// Contact type display labels
export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  buyer: '👤 Buyer',
  seller: '🏠 Seller',
  both: '🔄 Both'
}

// Temperature display labels
export const TEMPERATURE_LABELS: Record<ContactTemperature, string> = {
  hot: '🔥 Hot',
  warm: '🟡 Warm',
  cold: '🔵 Cold'
}

// Temperature descriptions
export const TEMPERATURE_DESCRIPTIONS: Record<ContactTemperature, string> = {
  hot: 'Very Interested',
  warm: 'Somewhat Interested',
  cold: 'Not Interested'
}

// Contact type CSS classes for styling
export const CONTACT_TYPE_CLASSES: Record<ContactType, string> = {
  buyer: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  seller: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  both: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
}

// Temperature CSS classes for styling
export const TEMPERATURE_CLASSES: Record<ContactTemperature, string> = {
  hot: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  warm: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  cold: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
}

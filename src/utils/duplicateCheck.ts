import { supabase } from '../lib/supabase'

export interface DuplicatePropertyResult {
  isDuplicate: boolean
  existingProperty?: {
    id: string
    address: string
    status: string
    price?: number
    bedrooms?: number
    property_type?: string
    created_at: string
  }
  similarity?: number
}

export interface DuplicateContactResult {
  isDuplicate: boolean
  existingContact?: {
    id: string
    name: string
    address: string
    phone?: string
    email?: string
    created_at: string
  }
  samePropertyContacts?: Array<{
    id: string
    name: string
    phone?: string
    email?: string
  }>
  similarity?: number
}

/**
 * Check for duplicate properties based on address similarity
 * Properties are considered duplicates if they have the same address
 */
export async function checkDuplicateProperty(
  userId: string,
  address: string,
  excludeId?: string
): Promise<DuplicatePropertyResult> {
  try {
    // Normalize address for comparison
    const normalizedAddress = normalizeAddress(address)
    
    // Query for properties with similar addresses
    let query = supabase
      .from('properties')
      .select('id, address, status, price, bedrooms, property_type, created_at')
      .eq('user_id', userId)
      .ilike('address', `%${normalizedAddress}%`)

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error checking duplicate properties:', error)
      return { isDuplicate: false }
    }

    if (!data || data.length === 0) {
      return { isDuplicate: false }
    }

    // Find the most similar address
    let bestMatch = null
    let bestSimilarity = 0

    for (const property of data) {
      const similarity = calculateAddressSimilarity(normalizedAddress, normalizeAddress(property.address))
      if (similarity > bestSimilarity && similarity > 0.8) { // 80% similarity threshold
        bestSimilarity = similarity
        bestMatch = property
      }
    }

    if (bestMatch) {
      return {
        isDuplicate: true,
        existingProperty: bestMatch,
        similarity: bestSimilarity
      }
    }

    return { isDuplicate: false }
  } catch (error) {
    console.error('Error in checkDuplicateProperty:', error)
    return { isDuplicate: false }
  }
}

/**
 * Check for duplicate contacts based on name, phone, email, and address
 * Contacts are considered duplicates if they have the same name AND (phone OR email)
 * But allows multiple contacts for the same property if name/contact details differ
 */
export async function checkDuplicateContact(
  userId: string,
  name: string,
  phone?: string,
  email?: string,
  address?: string,
  excludeId?: string
): Promise<DuplicateContactResult> {
  try {
    const normalizedName = normalizeName(name)
    const normalizedPhone = phone ? normalizePhone(phone) : null
    const normalizedEmail = email ? normalizeEmail(email) : null

    // First, check for exact duplicates (same name + same contact info)
    let query = supabase
      .from('contacts')
      .select('id, name, address, phone, email, created_at')
      .eq('user_id', userId)
      .ilike('name', `%${normalizedName}%`)

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error checking duplicate contacts:', error)
      return { isDuplicate: false }
    }

    if (!data || data.length === 0) {
      return { isDuplicate: false }
    }

    // Check for exact duplicates
    for (const contact of data) {
      const contactNormalizedName = normalizeName(contact.name)
      const contactNormalizedPhone = contact.phone ? normalizePhone(contact.phone) : null
      const contactNormalizedEmail = contact.email ? normalizeEmail(contact.email) : null

      // Check name similarity
      const nameSimilarity = calculateNameSimilarity(normalizedName, contactNormalizedName)
      
      if (nameSimilarity > 0.9) { // 90% name similarity
        // Check if contact details match
        const phoneMatch = normalizedPhone && contactNormalizedPhone && 
                          normalizedPhone === contactNormalizedPhone
        const emailMatch = normalizedEmail && contactNormalizedEmail && 
                          normalizedEmail === contactNormalizedEmail

        if (phoneMatch || emailMatch) {
          return {
            isDuplicate: true,
            existingContact: contact,
            similarity: nameSimilarity
          }
        }
      }
    }

    // If no exact duplicates, check for contacts at the same property
    if (address) {
      const normalizedAddress = normalizeAddress(address)
      const samePropertyContacts = []

      for (const contact of data) {
        const contactNormalizedAddress = normalizeAddress(contact.address)
        const addressSimilarity = calculateAddressSimilarity(normalizedAddress, contactNormalizedAddress)
        
        if (addressSimilarity > 0.8) { // 80% address similarity
          samePropertyContacts.push({
            id: contact.id,
            name: contact.name,
            phone: contact.phone,
            email: contact.email
          })
        }
      }

      if (samePropertyContacts.length > 0) {
        return {
          isDuplicate: false,
          samePropertyContacts
        }
      }
    }

    return { isDuplicate: false }
  } catch (error) {
    console.error('Error in checkDuplicateContact:', error)
    return { isDuplicate: false }
  }
}

/**
 * Normalize address for comparison
 */
function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

/**
 * Normalize name for comparison
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

/**
 * Normalize phone number for comparison
 */
function normalizePhone(phone: string): string {
  return phone
    .replace(/[^\d]/g, '') // Keep only digits
    .replace(/^64/, '0') // Convert NZ country code to local format
}

/**
 * Normalize email for comparison
 */
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

/**
 * Calculate similarity between two addresses using Levenshtein distance
 */
function calculateAddressSimilarity(address1: string, address2: string): number {
  const distance = levenshteinDistance(address1, address2)
  const maxLength = Math.max(address1.length, address2.length)
  return maxLength === 0 ? 1 : (maxLength - distance) / maxLength
}

/**
 * Calculate similarity between two names using Levenshtein distance
 */
function calculateNameSimilarity(name1: string, name2: string): number {
  const distance = levenshteinDistance(name1, name2)
  const maxLength = Math.max(name1.length, name2.length)
  return maxLength === 0 ? 1 : (maxLength - distance) / maxLength
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))

  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i
  }

  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      )
    }
  }

  return matrix[str2.length][str1.length]
}

/**
 * Migration script to re-geocode existing addresses with MapTiler API
 */

import { supabase } from '../lib/supabase'
import { batchGeocode, GeocodingResult } from '../lib/maptiler'

export interface MigrationProgress {
  total: number
  processed: number
  successful: number
  failed: number
  errors: string[]
}

export interface MigrationOptions {
  batchSize?: number
  delayBetweenBatches?: number
  onProgress?: (progress: MigrationProgress) => void
  skipExisting?: boolean // Skip records that already have coordinates
}

/**
 * Migrate contact addresses to use real geocoding
 */
export async function migrateContactAddresses(
  userId: string,
  options: MigrationOptions = {}
): Promise<MigrationProgress> {
  const {
    batchSize = 10,
    delayBetweenBatches = 1000,
    onProgress,
    skipExisting = true
  } = options

  const progress: MigrationProgress = {
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    errors: []
  }

  try {
    // Get all contacts for the user
    const query = supabase
      .from('contacts')
      .select('id, address, lat, lng')
      .eq('user_id', userId)
      .not('address', 'is', null)
      .neq('address', '')

    if (skipExisting) {
      query.or('lat.is.null,lng.is.null')
    }

    const { data: contacts, error } = await query

    if (error) throw error

    if (!contacts || contacts.length === 0) {
      console.log('No contacts found to migrate')
      return progress
    }

    progress.total = contacts.length
    console.log(`Starting migration for ${progress.total} contacts...`)

    // Process in batches
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize)
      const addresses = batch.map(contact => contact.address)

      try {
        // Geocode the batch
        const results = await batchGeocode(addresses)

        // Update database with results
        const updates = batch.map(contact => {
          const geocodeResult = results.get(contact.address)

          if (geocodeResult) {
            progress.successful++
            return {
              id: contact.id,
              lat: geocodeResult.lat,
              lng: geocodeResult.lng,
              geocoded_at: new Date().toISOString(),
              geocode_confidence: geocodeResult.confidence,
              geocode_source: 'maptiler'
            }
          } else {
            progress.failed++
            progress.errors.push(`Failed to geocode: ${contact.address}`)
            return null
          }
        }).filter(update => update !== null)

        // Batch update the database
        if (updates.length > 0) {
          for (const update of updates) {
            const { error: updateError } = await supabase
              .from('contacts')
              .update({
                lat: update.lat,
                lng: update.lng,
                updated_at: new Date().toISOString()
              })
              .eq('id', update.id)
              .eq('user_id', userId)

            if (updateError) {
              console.error(`Failed to update contact ${update.id}:`, updateError)
              progress.failed++
              progress.successful--
              progress.errors.push(`Database update failed for contact ${update.id}`)
            }
          }
        }

      } catch (error) {
        console.error('Batch processing error:', error)
        progress.failed += batch.length
        progress.errors.push(`Batch processing failed: ${error}`)
      }

      progress.processed += batch.length

      // Call progress callback
      onProgress?.(progress)

      // Delay between batches to respect rate limits
      if (i + batchSize < contacts.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches))
      }
    }

    console.log(`Migration completed. Success: ${progress.successful}, Failed: ${progress.failed}`)

  } catch (error) {
    console.error('Migration error:', error)
    progress.errors.push(`Migration failed: ${error}`)
  }

  return progress
}

/**
 * Migrate property addresses to use real geocoding
 */
export async function migratePropertyAddresses(
  userId: string,
  options: MigrationOptions = {}
): Promise<MigrationProgress> {
  const {
    batchSize = 10,
    delayBetweenBatches = 1000,
    onProgress,
    skipExisting = true
  } = options

  const progress: MigrationProgress = {
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    errors: []
  }

  try {
    // Get all properties for the user
    const query = supabase
      .from('properties')
      .select('id, address, lat, lng')
      .eq('user_id', userId)
      .not('address', 'is', null)
      .neq('address', '')

    if (skipExisting) {
      query.or('lat.is.null,lng.is.null')
    }

    const { data: properties, error } = await query

    if (error) throw error

    if (!properties || properties.length === 0) {
      console.log('No properties found to migrate')
      return progress
    }

    progress.total = properties.length
    console.log(`Starting migration for ${progress.total} properties...`)

    // Process in batches
    for (let i = 0; i < properties.length; i += batchSize) {
      const batch = properties.slice(i, i + batchSize)
      const addresses = batch.map(property => property.address)

      try {
        // Geocode the batch
        const results = await batchGeocode(addresses)

        // Update database with results
        const updates = batch.map(property => {
          const geocodeResult = results.get(property.address)

          if (geocodeResult) {
            progress.successful++
            return {
              id: property.id,
              lat: geocodeResult.lat,
              lng: geocodeResult.lng,
              geocoded_at: new Date().toISOString(),
              geocode_confidence: geocodeResult.confidence,
              geocode_source: 'maptiler'
            }
          } else {
            progress.failed++
            progress.errors.push(`Failed to geocode: ${property.address}`)
            return null
          }
        }).filter(update => update !== null)

        // Batch update the database
        if (updates.length > 0) {
          for (const update of updates) {
            const { error: updateError } = await supabase
              .from('properties')
              .update({
                lat: update.lat,
                lng: update.lng,
                updated_at: new Date().toISOString()
              })
              .eq('id', update.id)
              .eq('user_id', userId)

            if (updateError) {
              console.error(`Failed to update property ${update.id}:`, updateError)
              progress.failed++
              progress.successful--
              progress.errors.push(`Database update failed for property ${update.id}`)
            }
          }
        }

      } catch (error) {
        console.error('Batch processing error:', error)
        progress.failed += batch.length
        progress.errors.push(`Batch processing failed: ${error}`)
      }

      progress.processed += batch.length

      // Call progress callback
      onProgress?.(progress)

      // Delay between batches to respect rate limits
      if (i + batchSize < properties.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches))
      }
    }

    console.log(`Migration completed. Success: ${progress.successful}, Failed: ${progress.failed}`)

  } catch (error) {
    console.error('Migration error:', error)
    progress.errors.push(`Migration failed: ${error}`)
  }

  return progress
}

/**
 * Migrate both contacts and properties
 */
export async function migrateAllAddresses(
  userId: string,
  options: MigrationOptions = {}
): Promise<{ contacts: MigrationProgress; properties: MigrationProgress }> {
  console.log('Starting full address migration...')

  const contactProgress = await migrateContactAddresses(userId, {
    ...options,
    onProgress: (progress) => {
      console.log('Contacts:', progress)
      options.onProgress?.(progress)
    }
  })

  const propertyProgress = await migratePropertyAddresses(userId, {
    ...options,
    onProgress: (progress) => {
      console.log('Properties:', progress)
      options.onProgress?.(progress)
    }
  })

  console.log('Full migration completed.')
  console.log('Contact results:', contactProgress)
  console.log('Property results:', propertyProgress)

  return {
    contacts: contactProgress,
    properties: propertyProgress
  }
}
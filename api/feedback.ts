/**
 * Feedback Collection API Endpoint
 *
 * Handles feedback submission from beta users and stores in database
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

interface FeedbackData {
  type: 'bug' | 'feature_request' | 'general' | 'nps'
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  rating?: number
  category?: string
  page?: string
  userAgent?: string
  timestamp: string
  userId?: string
  metadata?: Record<string, unknown>
}

interface FeedbackRecord extends FeedbackData {
  id: string
  status: string
  created_at: string
  updated_at: string
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const feedbackData: FeedbackData = req.body

    // Validate required fields
    if (!feedbackData.title || !feedbackData.description || !feedbackData.type) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Generate unique feedback ID
    const feedbackId = generateFeedbackId()

    // Prepare feedback record
    const feedbackRecord = {
      id: feedbackId,
      ...feedbackData,
      status: 'open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Store in database (simulated for now - replace with actual database)
    await storeFeedback(feedbackRecord)

    // Send notifications for high priority items
    if (feedbackData.priority === 'critical' || feedbackData.priority === 'high') {
      await sendPriorityFeedbackAlert(feedbackRecord)
    }

    // Track NPS responses for analysis
    if (feedbackData.type === 'nps' && feedbackData.rating !== undefined) {
      await trackNPSResponse(feedbackData.rating, feedbackData.userId)
    }

    console.log(`📝 Feedback received: ${feedbackData.type} - ${feedbackData.title}`)

    res.status(200).json({
      success: true,
      feedbackId,
      message: 'Feedback submitted successfully'
    })

  } catch (error) {
    console.error('Feedback submission error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback'
    })
  }
}

/**
 * Generate unique feedback ID
 */
function generateFeedbackId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `fb_${timestamp}_${random}`
}

/**
 * Store feedback in database
 * In production, this would use your actual database (Supabase, etc.)
 */
async function storeFeedback(feedback: FeedbackRecord): Promise<void> {
  try {
    // For now, store in memory/file system
    // In production, use Supabase or your database

    // Example Supabase integration:
    /*
    const { error } = await supabase
      .from('feedback')
      .insert([feedback])

    if (error) throw error
    */

    // For development, log to console and store in memory
    console.log('💾 Storing feedback:', {
      id: feedback.id,
      type: feedback.type,
      title: feedback.title,
      priority: feedback.priority,
      userId: feedback.userId
    })

    // Store in local storage simulation
    const existingFeedback = JSON.parse(process.env.FEEDBACK_STORAGE || '[]')
    existingFeedback.push(feedback)

    // In production, this would be stored in persistent database
    console.log(`📊 Total feedback items: ${existingFeedback.length}`)

  } catch (error) {
    console.error('Failed to store feedback:', error)
    throw error
  }
}

/**
 * Send alert for high priority feedback
 */
async function sendPriorityFeedbackAlert(feedback: FeedbackRecord): Promise<void> {
  try {
    const alertMessage = `🚨 HIGH PRIORITY FEEDBACK RECEIVED

Type: ${feedback.type.toUpperCase()}
Priority: ${feedback.priority.toUpperCase()}
Title: ${feedback.title}
User: ${feedback.userId || 'Anonymous'}
Page: ${feedback.page}

Description:
${feedback.description}

Category: ${feedback.category || 'Not specified'}
Timestamp: ${feedback.timestamp}

Please review and respond promptly.`

    console.warn(alertMessage)

    // In production, send to Slack, email, or monitoring system
    if (process.env.FEEDBACK_ALERT_WEBHOOK) {
      await fetch(process.env.FEEDBACK_ALERT_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: alertMessage,
          priority: feedback.priority,
          type: 'feedback_alert'
        })
      })
    }

  } catch (error) {
    console.error('Failed to send priority feedback alert:', error)
  }
}

/**
 * Track NPS responses for analysis
 */
async function trackNPSResponse(rating: number, userId?: string): Promise<void> {
  try {
    const npsCategory = rating >= 9 ? 'promoter' : rating >= 7 ? 'passive' : 'detractor'

    const npsRecord = {
      rating,
      category: npsCategory,
      userId,
      timestamp: new Date().toISOString()
    }

    console.log(`📊 NPS Response: ${rating}/10 (${npsCategory})`, npsRecord)

    // Store NPS data for analysis
    // In production, this would go to analytics database

  } catch (error) {
    console.error('Failed to track NPS response:', error)
  }
}

interface FeedbackAnalytics {
  totalFeedback: number
  byType: {
    bug: number
    feature_request: number
    general: number
    nps: number
  }
  byPriority: {
    critical: number
    high: number
    medium: number
    low: number
  }
  averageNPS: number
  npsDistribution: {
    promoters: number
    passives: number
    detractors: number
  }
  recentTrends: {
    last7Days: number
    last30Days: number
  }
}

/**
 * Get feedback analytics (for admin dashboard)
 */
export async function getFeedbackAnalytics(): Promise<FeedbackAnalytics | null> {
  try {
    // This would query your database for feedback analytics
    const analytics: FeedbackAnalytics = {
      totalFeedback: 0,
      byType: {
        bug: 0,
        feature_request: 0,
        general: 0,
        nps: 0
      },
      byPriority: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      averageNPS: 0,
      npsDistribution: {
        promoters: 0,
        passives: 0,
        detractors: 0
      },
      recentTrends: {
        last7Days: 0,
        last30Days: 0
      }
    }

    return analytics

  } catch (error) {
    console.error('Failed to get feedback analytics:', error)
    return null
  }
}
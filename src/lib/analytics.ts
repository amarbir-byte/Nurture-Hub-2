/**
 * Google Analytics 4 Setup and Event Tracking
 *
 * Comprehensive analytics tracking for beta testing and user behavior analysis
 */

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

interface EventParams {
  [key: string]: string | number | boolean;
}

interface UserProperties {
  user_id?: string;
  user_type?: 'beta' | 'trial' | 'paid';
  subscription_plan?: string;
  experience_level?: string;
  market_type?: string;
  team_size?: string;
}

class Analytics {
  private isInitialized = false;
  private measurementId: string | null = null;

  /**
   * Initialize Google Analytics 4
   */
  init(measurementId: string) {
    if (this.isInitialized) return;

    this.measurementId = measurementId;

    // Load gtag script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    // Initialize dataLayer and gtag
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(...args: any[]) {
      window.dataLayer.push(arguments);
    };

    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
      // Enable enhanced measurement
      enhanced_measurements: true,
      // Set up for SPA tracking
      page_title: document.title,
      page_location: window.location.href,
      // Privacy settings
      anonymize_ip: true,
      allow_google_signals: false,
      // Custom settings for beta testing
      custom_map: {
        custom_parameter_1: 'user_type',
        custom_parameter_2: 'feature_usage'
      }
    });

    this.isInitialized = true;
    console.log('📊 Analytics initialized');
  }

  /**
   * Track page views (for SPA navigation)
   */
  trackPageView(path: string, title?: string) {
    if (!this.isInitialized) return;

    window.gtag('config', this.measurementId!, {
      page_path: path,
      page_title: title || document.title
    });
  }

  /**
   * Set user properties for segmentation
   */
  setUserProperties(properties: UserProperties) {
    if (!this.isInitialized) return;

    window.gtag('set', {
      user_id: properties.user_id,
      user_properties: {
        user_type: properties.user_type,
        subscription_plan: properties.subscription_plan,
        experience_level: properties.experience_level,
        market_type: properties.market_type,
        team_size: properties.team_size
      }
    });
  }

  /**
   * Track beta testing specific events
   */
  trackBetaEvent(action: string, params?: EventParams) {
    this.trackEvent('beta_testing', action, {
      event_category: 'beta',
      ...params
    });
  }

  /**
   * Track user onboarding progress
   */
  trackOnboardingEvent(step: string, completed: boolean, params?: EventParams) {
    this.trackEvent('onboarding', `${step}_${completed ? 'completed' : 'started'}`, {
      event_category: 'onboarding',
      onboarding_step: step,
      completed,
      ...params
    });
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(feature: string, action: string, params?: EventParams) {
    this.trackEvent('feature_usage', action, {
      event_category: 'features',
      feature_name: feature,
      ...params
    });
  }

  /**
   * Track marketing campaign events
   */
  trackMarketingEvent(action: string, params?: EventParams) {
    this.trackEvent('marketing', action, {
      event_category: 'marketing',
      ...params
    });
  }

  /**
   * Track user engagement events
   */
  trackEngagement(action: string, params?: EventParams) {
    this.trackEvent('engagement', action, {
      event_category: 'engagement',
      ...params
    });
  }

  /**
   * Track errors and issues
   */
  trackError(error: string, params?: EventParams) {
    this.trackEvent('error', 'application_error', {
      event_category: 'errors',
      error_message: error,
      ...params
    });
  }

  /**
   * Track conversion events
   */
  trackConversion(action: string, value?: number, params?: EventParams) {
    this.trackEvent('conversion', action, {
      event_category: 'conversions',
      value,
      currency: 'NZD',
      ...params
    });
  }

  /**
   * Generic event tracking
   */
  private trackEvent(eventName: string, action: string, params?: EventParams) {
    if (!this.isInitialized) {
      console.warn('Analytics not initialized');
      return;
    }

    const eventData = {
      action,
      timestamp: new Date().toISOString(),
      page_path: window.location.pathname,
      ...params
    };

    window.gtag('event', eventName, eventData);

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Analytics Event: ${eventName}`, eventData);
    }
  }
}

// Create singleton instance
export const analytics = new Analytics();

/**
 * React hook for analytics tracking
 */
export const useAnalytics = () => {
  return {
    trackPageView: analytics.trackPageView.bind(analytics),
    trackBetaEvent: analytics.trackBetaEvent.bind(analytics),
    trackOnboardingEvent: analytics.trackOnboardingEvent.bind(analytics),
    trackFeatureUsage: analytics.trackFeatureUsage.bind(analytics),
    trackMarketingEvent: analytics.trackMarketingEvent.bind(analytics),
    trackEngagement: analytics.trackEngagement.bind(analytics),
    trackError: analytics.trackError.bind(analytics),
    trackConversion: analytics.trackConversion.bind(analytics),
    setUserProperties: analytics.setUserProperties.bind(analytics)
  };
};

/**
 * Initialize analytics with environment-specific tracking ID
 */
export const initializeAnalytics = () => {
  const trackingId = process.env.NODE_ENV === 'production'
    ? 'G-XXXXXXXXXX' // Replace with actual GA4 Measurement ID
    : 'G-XXXXXXXXXX'; // Use same ID for staging, or different for testing

  analytics.init(trackingId);
};

/**
 * Beta Testing Specific Analytics Helpers
 */
export const betaAnalytics = {
  // Track beta user signup
  trackBetaSignup: (userProfile: any) => {
    analytics.trackBetaEvent('signup', {
      experience_level: userProfile.experience,
      current_crm: userProfile.currentCrm,
      team_size: userProfile.teamSize,
      market_type: userProfile.marketType,
      marketing_budget: userProfile.marketingBudget,
      pain_points: userProfile.painPoints?.join(',')
    });
  },

  // Track feature discovery
  trackFeatureDiscovery: (feature: string, method: 'tour' | 'organic' | 'help') => {
    analytics.trackFeatureUsage(feature, 'discovered', {
      discovery_method: method
    });
  },

  // Track feedback submission
  trackFeedbackSubmission: (type: 'bug' | 'feature_request' | 'general', rating?: number) => {
    analytics.trackBetaEvent('feedback_submitted', {
      feedback_type: type,
      rating
    });
  },

  // Track user satisfaction milestones
  trackSatisfactionMilestone: (milestone: string, value: number) => {
    analytics.trackBetaEvent('satisfaction_milestone', {
      milestone,
      value
    });
  },

  // Track retention events
  trackRetention: (daysActive: number, sessionsCount: number) => {
    analytics.trackEngagement('retention_check', {
      days_active: daysActive,
      sessions_count: sessionsCount
    });
  }
};

/**
 * Real Estate Specific Analytics
 */
export const realEstateAnalytics = {
  // Track contact management
  trackContactAction: (action: 'import' | 'add' | 'edit' | 'delete', count?: number) => {
    analytics.trackFeatureUsage('contacts', action, {
      contact_count: count
    });
  },

  // Track property management
  trackPropertyAction: (action: 'add' | 'edit' | 'delete' | 'view', propertyType?: string) => {
    analytics.trackFeatureUsage('properties', action, {
      property_type: propertyType
    });
  },

  // Track proximity marketing usage
  trackProximityMarketing: (action: 'search' | 'campaign_created' | 'message_sent', data?: any) => {
    analytics.trackMarketingEvent(action, {
      radius: data?.radius,
      contacts_found: data?.contactsFound,
      messages_sent: data?.messagesSent
    });
  },

  // Track SMS campaign performance
  trackSMSCampaign: (action: 'created' | 'sent' | 'delivered' | 'clicked', campaignData?: any) => {
    analytics.trackMarketingEvent(`sms_${action}`, {
      template_used: campaignData?.template,
      recipient_count: campaignData?.recipientCount,
      campaign_type: campaignData?.type
    });
  }
};
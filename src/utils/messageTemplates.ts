export interface MessageTemplate {
  id: string
  name: string
  type: 'email' | 'sms'
  category: 'property' | 'contact' | 'general'
  subject?: string
  message: string
  variables: string[]
}

export const messageTemplates: MessageTemplate[] = [
  // Property Templates
  {
    id: 'property-new-listing',
    name: 'New Property Listing',
    type: 'email',
    category: 'property',
    subject: 'New Property Alert: {{property_address}}',
    message: `Hi {{contact_name}},

I wanted to let you know about a new property that just came on the market:

📍 {{property_address}}
💰 {{property_price}}
🏠 {{property_type}} • {{bedrooms}} bed • {{bathrooms}} bath
📏 {{floor_area}}m² floor area

{{property_description}}

This property is in your preferred area and matches your criteria. Would you like to schedule a viewing?

Best regards,
{{agent_name}}`,
    variables: ['contact_name', 'property_address', 'property_price', 'property_type', 'bedrooms', 'bathrooms', 'floor_area', 'property_description', 'agent_name']
  },
  {
    id: 'property-price-drop',
    name: 'Price Drop Alert',
    type: 'email',
    category: 'property',
    subject: 'Price Drop: {{property_address}}',
    message: `Hi {{contact_name}},

Great news! The property you were interested in has had a price reduction:

📍 {{property_address}}
💰 Was: {{old_price}} → Now: {{new_price}}
💡 Savings: {{savings_amount}}

This could be a great opportunity. Would you like to arrange a viewing?

Best regards,
{{agent_name}}`,
    variables: ['contact_name', 'property_address', 'old_price', 'new_price', 'savings_amount', 'agent_name']
  },
  {
    id: 'property-sold',
    name: 'Property Sold Notification',
    type: 'email',
    category: 'property',
    subject: 'Property Sold: {{property_address}}',
    message: `Hi {{contact_name}},

I wanted to update you that the property at {{property_address}} has been sold for {{sale_price}}.

However, I have several similar properties in the same area that might interest you. Would you like me to send you some options?

Best regards,
{{agent_name}}`,
    variables: ['contact_name', 'property_address', 'sale_price', 'agent_name']
  },
  {
    id: 'property-sms-listing',
    name: 'Property SMS Alert',
    type: 'sms',
    category: 'property',
    message: `Hi {{contact_name}}! New property alert: {{property_address}} - {{property_price}} • {{property_type}} • {{bedrooms}} bed. Interested? Reply YES for more details. - {{agent_name}}`,
    variables: ['contact_name', 'property_address', 'property_price', 'property_type', 'bedrooms', 'agent_name']
  },
  {
    id: 'property-sms-price-drop',
    name: 'Price Drop SMS',
    type: 'sms',
    category: 'property',
    message: `Price drop alert! {{property_address}} reduced from {{old_price}} to {{new_price}}. Save {{savings_amount}}! Interested? Reply YES. - {{agent_name}}`,
    variables: ['property_address', 'old_price', 'new_price', 'savings_amount', 'agent_name']
  },

  // Contact Templates
  {
    id: 'contact-follow-up',
    name: 'Follow-up Check-in',
    type: 'email',
    category: 'contact',
    subject: 'How is your property search going?',
    message: `Hi {{contact_name}},

I hope you're doing well! I wanted to check in and see how your property search is progressing.

Have you had a chance to view any properties recently? I'm here to help with:
• Finding properties that match your criteria
• Arranging viewings
• Market insights and pricing advice
• Negotiation support

Please let me know if there's anything I can assist you with.

Best regards,
{{agent_name}}`,
    variables: ['contact_name', 'agent_name']
  },
  {
    id: 'contact-market-update',
    name: 'Market Update',
    type: 'email',
    category: 'contact',
    subject: 'Market Update for {{area}}',
    message: `Hi {{contact_name}},

I wanted to share some market insights for the {{area}} area:

📊 Market Statistics:
• Average sale price: {{avg_price}}
• Properties sold this month: {{properties_sold}}
• Days on market: {{avg_days}}

🏠 New Listings:
{{new_listings_summary}}

This is a great time to be in the market. Would you like to discuss your options?

Best regards,
{{agent_name}}`,
    variables: ['contact_name', 'area', 'avg_price', 'properties_sold', 'avg_days', 'new_listings_summary', 'agent_name']
  },
  {
    id: 'contact-sms-follow-up',
    name: 'SMS Follow-up',
    type: 'sms',
    category: 'contact',
    message: `Hi {{contact_name}}! How's your property search going? I have some new listings that might interest you. Reply YES for details. - {{agent_name}}`,
    variables: ['contact_name', 'agent_name']
  },
  {
    id: 'contact-sms-viewing',
    name: 'Viewing Reminder SMS',
    type: 'sms',
    category: 'contact',
    message: `Reminder: Your viewing at {{property_address}} is tomorrow at {{viewing_time}}. Please confirm you can make it. - {{agent_name}}`,
    variables: ['property_address', 'viewing_time', 'agent_name']
  },

  // General Templates
  {
    id: 'general-meeting-request',
    name: 'Meeting Request',
    type: 'email',
    category: 'general',
    subject: 'Meeting Request - Property Discussion',
    message: `Hi {{contact_name}},

I'd love to schedule a meeting to discuss your property needs in more detail.

I'm available:
• {{available_times}}

We can discuss:
• Your property requirements
• Market conditions
• Financing options
• Next steps

Please let me know what time works best for you.

Best regards,
{{agent_name}}`,
    variables: ['contact_name', 'available_times', 'agent_name']
  },
  {
    id: 'general-sms-meeting',
    name: 'SMS Meeting Request',
    type: 'sms',
    category: 'general',
    message: `Hi {{contact_name}}! I'd love to meet and discuss your property needs. Available {{available_times}}. Reply with your preferred time. - {{agent_name}}`,
    variables: ['contact_name', 'available_times', 'agent_name']
  }
]

export function getTemplatesByType(type: 'email' | 'sms', category?: 'property' | 'contact' | 'general'): MessageTemplate[] {
  return messageTemplates.filter(template => {
    if (template.type !== type) return false
    if (category && template.category !== category) return false
    return true
  })
}

export function getTemplateById(id: string): MessageTemplate | undefined {
  return messageTemplates.find(template => template.id === id)
}

export function replaceTemplateVariables(template: MessageTemplate, variables: Record<string, string>): { subject?: string; message: string } {
  let subject = template.subject
  let message = template.message

  // Replace variables in subject
  if (subject) {
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      subject = subject!.replace(regex, value || '')
    })
  }

  // Replace variables in message
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g')
    message = message.replace(regex, value || '')
  })

  return { subject, message }
}

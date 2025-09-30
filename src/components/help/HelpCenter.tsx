/**
 * Help Center Component
 *
 * Comprehensive help documentation and FAQ system for beta users
 */

import { useState, useEffect } from 'react'
import { useAnalytics } from '../../lib/analytics'

interface HelpArticle {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  lastUpdated: string
  helpful: number
  views: number
}

interface FAQItem {
  id: string
  question: string
  answer: string
  category: string
  helpful: number
}

export const HelpCenter = () => {
  const [activeTab, setActiveTab] = useState<'articles' | 'faq' | 'contact'>('articles')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [articles] = useState<HelpArticle[]>(helpArticles)
  const [faqs] = useState<FAQItem[]>(faqItems)
  const { trackEngagement } = useAnalytics()

  useEffect(() => {
    trackEngagement('help_center_visited', { tab: activeTab })
  }, [activeTab, trackEngagement])

  const categories = [
    { id: 'all', label: 'All Topics', icon: '📚' },
    { id: 'getting-started', label: 'Getting Started', icon: '🚀' },
    { id: 'contacts', label: 'Contacts', icon: '👥' },
    { id: 'properties', label: 'Properties', icon: '🏠' },
    { id: 'marketing', label: 'Marketing', icon: '🎯' },
    { id: 'templates', label: 'SMS Templates', icon: '📝' },
    { id: 'billing', label: 'Billing & Plans', icon: '💳' },
    { id: 'troubleshooting', label: 'Troubleshooting', icon: '🔧' }
  ]

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">📚 Help Center</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Find answers to common questions, learn how to use features, and get the most out of Nurture Hub.
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md mx-auto">
          <input
            type="text"
            placeholder="Search help articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input w-full pl-10"
          />
          <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Categories */}
      <div className="mb-6">
        <div className="flex flex-wrap justify-center gap-2">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="mr-1">{category.icon}</span>
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex justify-center">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('articles')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'articles'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📖 Help Articles
            </button>
            <button
              onClick={() => setActiveTab('faq')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'faq'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ❓ FAQ
            </button>
            <button
              onClick={() => setActiveTab('contact')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'contact'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              💬 Contact Support
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'articles' && (
        <ArticlesTab articles={filteredArticles} />
      )}

      {activeTab === 'faq' && (
        <FAQTab faqs={filteredFAQs} />
      )}

      {activeTab === 'contact' && (
        <ContactTab />
      )}
    </div>
  )
}

const ArticlesTab = ({ articles }: { articles: HelpArticle[], onSearch?: (query: string) => void }) => {
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null)
  const { trackEngagement } = useAnalytics()

  const handleArticleView = (article: HelpArticle) => {
    setSelectedArticle(article)
    trackEngagement('help_article_viewed', { article_id: article.id, article_title: article.title })
  }

  if (selectedArticle) {
    return <ArticleView article={selectedArticle} onBack={() => setSelectedArticle(null)} />
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {articles.map(article => (
        <div
          key={article.id}
          onClick={() => handleArticleView(article)}
          className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
        >
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{article.title}</h3>
          <p className="text-gray-600 text-sm mb-4 line-clamp-3">
            {article.content.substring(0, 150)}...
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
              {categories.find(c => c.id === article.category)?.label}
            </span>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>👁 {article.views}</span>
              <span>👍 {article.helpful}</span>
            </div>
          </div>
        </div>
      ))}

      {articles.length === 0 && (
        <div className="col-span-full text-center py-12">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No articles found</h3>
          <p className="text-gray-600">Try adjusting your search or browse by category.</p>
        </div>
      )}
    </div>
  )
}

const ArticleView = ({ article, onBack }: { article: HelpArticle, onBack: () => void }) => {
  const [helpful, setHelpful] = useState<boolean | null>(null)

  const handleHelpful = (isHelpful: boolean) => {
    setHelpful(isHelpful)
    // In production, this would update the article's helpful count
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6"
      >
        ← Back to articles
      </button>

      <article className="bg-white rounded-lg border border-gray-200 p-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{article.title}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>Category: {categories.find(c => c.id === article.category)?.label}</span>
            <span>Last updated: {new Date(article.lastUpdated).toLocaleDateString()}</span>
            <span>👁 {article.views} views</span>
          </div>
        </header>

        <div className="prose max-w-none mb-8">
          {article.content.split('\n\n').map((paragraph, index) => (
            <p key={index} className="mb-4 text-gray-700 leading-relaxed">{paragraph}</p>
          ))}
        </div>

        <footer className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Was this helpful?</span>
              <button
                onClick={() => handleHelpful(true)}
                className={`p-2 rounded transition-colors ${
                  helpful === true ? 'bg-green-100 text-green-600' : 'text-gray-400 hover:text-green-600'
                }`}
              >
                👍
              </button>
              <button
                onClick={() => handleHelpful(false)}
                className={`p-2 rounded transition-colors ${
                  helpful === false ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:text-red-600'
                }`}
              >
                👎
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {article.tags.map(tag => (
                <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </footer>
      </article>
    </div>
  )
}

const FAQTab = ({ faqs }: { faqs: FAQItem[] }) => {
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null)

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {faqs.map(faq => (
        <div key={faq.id} className="bg-white rounded-lg border border-gray-200">
          <button
            onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
            className="w-full text-left p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-medium text-gray-900 pr-4">{faq.question}</h3>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${
                expandedFAQ === faq.id ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedFAQ === faq.id && (
            <div className="px-6 pb-6">
              <div className="text-gray-700 leading-relaxed">{faq.answer}</div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>Helpful?</span>
                  <button className="text-gray-400 hover:text-green-600">👍</button>
                  <button className="text-gray-400 hover:text-red-600">👎</button>
                </div>
                <span className="text-xs text-gray-400">👍 {faq.helpful}</span>
              </div>
            </div>
          )}
        </div>
      ))}

      {faqs.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">❓</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No FAQs found</h3>
          <p className="text-gray-600">Try adjusting your search or browse by category.</p>
        </div>
      )}
    </div>
  )
}

const ContactTab = () => {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Beta Support Contact */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">🚀 Beta Support</h3>
        <p className="text-blue-800 mb-4">
          As a beta tester, you have direct access to our team. We're here to help and value your feedback!
        </p>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-blue-600">📞</span>
            <div>
              <div className="font-medium text-blue-900">WhatsApp Support</div>
              <div className="text-blue-700">+64 xxx xxx xxx</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-blue-600">✉️</span>
            <div>
              <div className="font-medium text-blue-900">Email Support</div>
              <div className="text-blue-700">beta@nurturehub.co.nz</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-blue-600">💬</span>
            <div>
              <div className="font-medium text-blue-900">Slack Channel</div>
              <div className="text-blue-700">Beta Testers Community</div>
            </div>
          </div>
        </div>
      </div>

      {/* Response Times */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">⏰ Response Times</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Critical Issues</span>
            <span className="font-medium">Within 2 hours</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">General Support</span>
            <span className="font-medium">Within 24 hours</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Feature Requests</span>
            <span className="font-medium">Within 48 hours</span>
          </div>
        </div>
      </div>

      {/* Common Resources */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Before Contacting Support</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span>Check the FAQ section above</span>
          </div>
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span>Try the feature tour in the app</span>
          </div>
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span>Review the quick start guide</span>
          </div>
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span>Check your internet connection</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Help Articles Data
const helpArticles: HelpArticle[] = [
  {
    id: 'getting-started-guide',
    title: 'Getting Started with Nurture Hub',
    content: `Welcome to Nurture Hub! This guide will help you get up and running quickly.

Step 1: Complete Your Profile
Start by completing your agent profile with your business details, contact information, and preferences. This helps personalize your experience.

Step 2: Import Your Contacts
Upload your existing contact database using our REINZ CSV import feature, or add contacts manually. The system supports bulk imports and automatically validates contact information.

Step 3: Add Your Properties
Add your current listings and properties to start using proximity marketing. Each property becomes a marketing hub for targeted campaigns.

Step 4: Try Proximity Marketing
Use our unique proximity search to find contacts near your properties. Set your radius and create targeted SMS campaigns to nearby prospects.

Step 5: Customize Your Templates
Personalize the included SMS templates or create your own. Use dynamic placeholders to automatically include contact and property details.

Tips for Success:
- Start with a small radius (0.5km) and expand as needed
- Personalize your messages with contact names and specific property details
- Track your campaign performance and adjust your approach
- Use the quick start guide for step-by-step assistance`,
    category: 'getting-started',
    tags: ['setup', 'tutorial', 'basics'],
    lastUpdated: '2025-09-29',
    helpful: 15,
    views: 89
  },
  {
    id: 'proximity-marketing-guide',
    title: 'How to Use Proximity Marketing',
    content: `Proximity marketing is Nurture Hub's flagship feature that helps you find and contact prospects near your listings.

How It Works:
1. Select a property from your listings
2. Choose a search radius (0.1km to 5km)
3. The system finds contacts within that radius
4. Create and send targeted SMS campaigns

Best Practices:
- Start with smaller radiuses for more targeted campaigns
- Customize your message for the specific property and area
- Include compelling property details and your contact information
- Follow up with interested prospects promptly

Radius Guidelines:
- 0.1-0.5km: Immediate neighbors, highest relevance
- 0.5-1km: Local area, good engagement rates
- 1-2km: Extended neighborhood, moderate relevance
- 2-5km: Broader area, use for high-value properties

Success Tips:
- Mention specific local landmarks or streets
- Highlight unique property features
- Include your credentials and experience
- Provide clear next steps for interested contacts

Legal Compliance:
- Always include opt-out instructions
- Respect contact preferences
- Follow New Zealand SMS marketing regulations
- Maintain professional communication standards`,
    category: 'marketing',
    tags: ['proximity', 'campaigns', 'SMS', 'targeting'],
    lastUpdated: '2025-09-29',
    helpful: 23,
    views: 156
  }
  // Additional articles would be added here...
]

// FAQ Data
const faqItems: FAQItem[] = [
  {
    id: 'what-is-proximity-marketing',
    question: 'What is proximity marketing and how does it work?',
    answer: 'Proximity marketing allows you to find contacts near your property listings and send targeted SMS campaigns. Simply select a property, choose a radius (0.1km to 5km), and the system will show contacts within that area. You can then create personalized SMS campaigns to reach potential buyers or sellers in the immediate vicinity.',
    category: 'marketing',
    helpful: 18
  },
  {
    id: 'import-contacts',
    question: 'How do I import my existing contacts?',
    answer: 'You can import contacts in several ways: 1) Upload a REINZ CSV file using our import tool, 2) Upload any CSV file with contact information, or 3) Add contacts manually. The system automatically validates phone numbers and addresses, and detects duplicates to keep your database clean.',
    category: 'contacts',
    helpful: 25
  },
  {
    id: 'sms-costs',
    question: 'How much do SMS messages cost?',
    answer: 'SMS costs are included in your subscription plan up to your monthly limit. Basic plans include 500 SMS per month, Professional plans include 2,000 SMS per month, and Enterprise plans include 10,000 SMS per month. Additional messages can be purchased if needed.',
    category: 'billing',
    helpful: 12
  },
  {
    id: 'data-security',
    question: 'How secure is my data?',
    answer: 'We take data security seriously. All data is encrypted in transit and at rest, we use enterprise-grade security measures, and we\'re compliant with New Zealand privacy laws. Your contact information is never shared with third parties, and you maintain full control over your data.',
    category: 'troubleshooting',
    helpful: 8
  }
  // Additional FAQs would be added here...
]

const categories = [
  { id: 'all', label: 'All Topics', icon: '📚' },
  { id: 'getting-started', label: 'Getting Started', icon: '🚀' },
  { id: 'contacts', label: 'Contacts', icon: '👥' },
  { id: 'properties', label: 'Properties', icon: '🏠' },
  { id: 'marketing', label: 'Marketing', icon: '🎯' },
  { id: 'templates', label: 'SMS Templates', icon: '📝' },
  { id: 'billing', label: 'Billing & Plans', icon: '💳' },
  { id: 'troubleshooting', label: 'Troubleshooting', icon: '🔧' }
]
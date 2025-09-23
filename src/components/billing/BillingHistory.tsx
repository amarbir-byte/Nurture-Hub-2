interface UserSubscription {
  id: string
  subscription_status: string
  plan_type: string | null
  unlimited_access: boolean
  trial_end_date: string | null
}

interface BillingHistoryProps {
  userSubscription: UserSubscription | null
}

// Mock billing history data - in production this would come from Stripe
const mockBillingHistory = [
  {
    id: 'inv_001',
    date: '2024-01-15',
    description: 'Nurture Hub Professional Plan',
    amount: 79.00,
    status: 'paid',
    invoiceUrl: '#'
  },
  {
    id: 'inv_002',
    date: '2023-12-15',
    description: 'Nurture Hub Professional Plan',
    amount: 79.00,
    status: 'paid',
    invoiceUrl: '#'
  },
  {
    id: 'inv_003',
    date: '2023-11-15',
    description: 'Nurture Hub Starter Plan',
    amount: 29.00,
    status: 'paid',
    invoiceUrl: '#'
  }
]

export function BillingHistory({ userSubscription }: BillingHistoryProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD'
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="badge bg-green-100 text-green-800">Paid</span>
      case 'pending':
        return <span className="badge bg-yellow-100 text-yellow-800">Pending</span>
      case 'failed':
        return <span className="badge bg-red-100 text-red-800">Failed</span>
      default:
        return <span className="badge bg-gray-100 text-gray-800">{status}</span>
    }
  }

  const downloadInvoice = (invoiceId: string) => {
    // In production, this would download from Stripe
    alert(`Downloading invoice ${invoiceId}. In production, this would download the PDF invoice.`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900">Billing History</h3>
        <p className="text-sm text-gray-600 mt-1">
          View and download your past invoices and payment history.
        </p>
      </div>

      {/* Current Billing Info */}
      {userSubscription && (
        <div className="card bg-gray-50">
          <h4 className="font-medium text-gray-900 mb-3">Current Billing Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Plan:</span>
              <span className="ml-2 font-medium">
                {userSubscription.unlimited_access ? 'Unlimited Access' :
                 userSubscription.plan_type ?
                 `${userSubscription.plan_type.charAt(0).toUpperCase() + userSubscription.plan_type.slice(1)} Plan` :
                 'Free Trial'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>
              <span className="ml-2 font-medium capitalize">
                {userSubscription.subscription_status}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Billing Cycle:</span>
              <span className="ml-2 font-medium">Monthly</span>
            </div>
            <div>
              <span className="text-gray-600">Next Payment:</span>
              <span className="ml-2 font-medium">
                {userSubscription.subscription_status === 'active' ? 'February 15, 2024' : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Invoice History */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-gray-900">Invoice History</h4>
          <button className="btn-secondary text-sm">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export All
          </button>
        </div>

        {mockBillingHistory.length === 0 ? (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Your billing history will appear here once you have a paid subscription.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mockBillingHistory.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(invoice.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatAmount(invoice.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => downloadInvoice(invoice.id)}
                        className="text-primary-600 hover:text-primary-900 font-medium"
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Methods */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-gray-900">Payment Methods</h4>
          <button className="btn-secondary text-sm">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Card
          </button>
        </div>

        <div className="space-y-3">
          {/* Mock credit card */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">
                  •••• •••• •••• 4242
                </div>
                <div className="text-xs text-gray-500">
                  Expires 12/25 • Default payment method
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <button className="text-sm text-gray-600 hover:text-gray-900">Edit</button>
              <button className="text-sm text-red-600 hover:text-red-900">Remove</button>
            </div>
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-500">
          <p>
            💳 All payments are securely processed by Stripe. We never store your credit card information.
          </p>
        </div>
      </div>

      {/* Billing Support */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Need help with billing?</h3>
            <p className="mt-1 text-sm text-blue-700">
              Contact our support team if you have questions about your subscription,
              need to update payment information, or want to discuss enterprise options.
            </p>
            <div className="mt-3">
              <button className="text-sm font-medium text-blue-800 underline hover:text-blue-600">
                Contact billing support →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSubscription } from '../../contexts/SubscriptionContext'
import { supabase } from '../../lib/supabase'

interface User {
  id: string
  email: string
  subscription_status: string
  plan_type: string | null
  unlimited_access: boolean
  is_admin: boolean
  created_at: string
}

export function AdminPanel() {
  const { user } = useAuth()
  const { userSubscription } = useSubscription()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Check if current user is admin
  const isAdmin = userSubscription?.is_admin

  useEffect(() => {
    if (isAdmin) {
      fetchUsers()
    }
  }, [isAdmin])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, subscription_status, plan_type, unlimited_access, is_admin, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleUnlimitedAccess = async (userId: string, currentAccess: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          unlimited_access: !currentAccess,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) throw error

      // Update local state
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, unlimited_access: !currentAccess } : u
      ))
    } catch (error) {
      console.error('Error updating user access:', error)
      alert('Error updating user access')
    }
  }

  const toggleAdminAccess = async (userId: string, currentAdmin: boolean) => {
    if (userId === user?.id) {
      alert("You cannot remove your own admin access")
      return
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({
          is_admin: !currentAdmin,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) throw error

      // Update local state
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, is_admin: !currentAdmin } : u
      ))
    } catch (error) {
      console.error('Error updating admin access:', error)
      alert('Error updating admin access')
    }
  }

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!isAdmin) {
    return (
      <div className="card text-center">
        <div className="text-red-600 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Access Denied</h3>
        <p className="text-gray-600 dark:text-gray-400">You need admin access to view this page.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600 dark:text-primary-300">Loading users...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage user access and permissions</p>
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400 dark:text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search users by email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-700">
            <thead className="bg-gray-50 dark:bg-dark-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-primary-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-primary-400 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-primary-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-primary-400 uppercase tracking-wider">
                  Access Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-primary-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-800 divide-y divide-gray-200 dark:divide-dark-700">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-dark-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {user.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.email}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-primary-400">
                          {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {user.plan_type ? user.plan_type.charAt(0).toUpperCase() + user.plan_type.slice(1) : 'Trial'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.subscription_status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                      user.subscription_status === 'trialing' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                      {user.subscription_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col space-y-1">
                      {user.unlimited_access && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                          Unlimited Access
                        </span>
                      )}
                      {user.is_admin && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                          Admin
                        </span>
                      )}
                      {!user.unlimited_access && !user.is_admin && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-dark-600 dark:text-primary-300">
                          Standard
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap space-y-2">
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={() => toggleUnlimitedAccess(user.id, user.unlimited_access)}
                        className={`text-xs px-3 py-1 rounded-md font-medium ${
                          user.unlimited_access
                            ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50'
                            : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50'
                        }`}
                      >
                        {user.unlimited_access ? 'Remove Unlimited' : 'Grant Unlimited'}
                      </button>
                      <button
                        onClick={() => toggleAdminAccess(user.id, user.is_admin)}
                        disabled={user.id === userSubscription?.id}
                        className={`text-xs px-3 py-1 rounded-md font-medium ${
                          user.id === userSubscription?.id
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-dark-600 dark:text-primary-500'
                            : user.is_admin
                              ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50'
                        }`}
                      >
                        {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-primary-400">No users found</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{users.length}</div>
          <div className="text-sm text-gray-600 dark:text-primary-400">Total Users</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">{users.filter(u => u.subscription_status === 'active').length}</div>
          <div className="text-sm text-gray-600 dark:text-primary-400">Active Subscribers</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-purple-600">{users.filter(u => u.unlimited_access).length}</div>
          <div className="text-sm text-gray-600 dark:text-primary-400">Unlimited Access</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-red-600">{users.filter(u => u.is_admin).length}</div>
          <div className="text-sm text-gray-600 dark:text-primary-400">Admins</div>
        </div>
      </div>
    </div>
  )
}
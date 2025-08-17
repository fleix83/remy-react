import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../../stores/auth.store'
import UserSearchService from '../../services/user-search.service'
import AvatarService from '../../services/avatar.service'
import type { User, UserBlock } from '../../types/database.types'

interface BlockedUserInfo {
  id: string
  username: string
  avatar_url?: string | null
  created_at: string
}

interface UserBlockWithUser extends UserBlock {
  blocked_user?: BlockedUserInfo
}

const BlockedUsers: React.FC = () => {
  const { userProfile } = useAuthStore()
  const [blockedUsers, setBlockedUsers] = useState<UserBlockWithUser[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Partial<User>[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    if (userProfile?.id) {
      loadBlockedUsers()
    }
  }, [userProfile?.id])

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchQuery.length >= 2) {
        performSearch()
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(delayedSearch)
  }, [searchQuery])

  const loadBlockedUsers = async () => {
    if (!userProfile?.id) return

    setIsLoading(true)
    try {
      const blocked = await UserSearchService.getBlockedUsers(userProfile.id)
      setBlockedUsers(blocked)
    } catch (error) {
      console.error('Error loading blocked users:', error)
      setMessage({ type: 'error', text: 'Failed to load blocked users' })
    } finally {
      setIsLoading(false)
    }
  }

  const performSearch = async () => {
    if (!userProfile?.id || searchQuery.length < 2) return

    setIsSearching(true)
    try {
      const results = await UserSearchService.searchUsers(searchQuery, userProfile.id)
      // Filter out already blocked users
      const blockedIds = blockedUsers.map(bu => bu.blocked_id)
      const filteredResults = results.filter(user => user.id && !blockedIds.includes(user.id))
      setSearchResults(filteredResults)
    } catch (error) {
      console.error('Error searching users:', error)
      setMessage({ type: 'error', text: 'Failed to search users' })
    } finally {
      setIsSearching(false)
    }
  }

  const handleBlockUser = async (userToBlock: Partial<User>) => {
    if (!userProfile?.id) return

    setIsSearching(true)
    setMessage(null)

    try {
      await UserSearchService.blockUser(userProfile.id, userToBlock.id!)
      setMessage({ type: 'success', text: `Successfully blocked ${userToBlock.username}` })
      
      // Refresh blocked users list
      await loadBlockedUsers()
      
      // Clear search
      setSearchQuery('')
      setSearchResults([])
      
    } catch (error) {
      console.error('Error blocking user:', error)
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to block user'
      })
    } finally {
      setIsSearching(false)
    }
  }

  const handleUnblockUser = async (userToUnblock: UserBlockWithUser) => {
    if (!userProfile?.id) return

    setIsLoading(true)
    setMessage(null)

    try {
      await UserSearchService.unblockUser(userProfile.id, userToUnblock.blocked_id)
      setMessage({ 
        type: 'success', 
        text: `Successfully unblocked ${userToUnblock.blocked_user?.username || 'user'}` 
      })
      
      // Refresh blocked users list
      await loadBlockedUsers()
      
    } catch (error) {
      console.error('Error unblocking user:', error)
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to unblock user'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const clearMessage = () => setMessage(null)

  if (!userProfile) return null

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Blocked Users</h2>

        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center justify-between ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            <span>{message.text}</span>
            <button
              onClick={clearMessage}
              className="text-current hover:opacity-75 ml-2"
            >
              ×
            </button>
          </div>
        )}

        {/* Search Section */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search users to block
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type username to search..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#37a653] focus:border-transparent"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#37a653]"></div>
              </div>
            )}
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-2 border border-gray-200 rounded-lg bg-white shadow-sm max-h-48 overflow-y-auto">
              {searchResults.map((user) => (
                <div key={user.id} className="p-3 border-b border-gray-100 last:border-b-0 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center">
                    <img
                      src={user.avatar_url || AvatarService.getDefaultAvatar(user.username || 'User')}
                      alt={`${user.username || 'User'}'s avatar`}
                      className="w-8 h-8 rounded-full mr-3"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{user.username}</p>
                      <p className="text-xs text-gray-500">Member since {formatDate(user.created_at!)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleBlockUser(user)}
                    disabled={isSearching}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Block
                  </button>
                </div>
              ))}
            </div>
          )}

          {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
            <p className="mt-2 text-sm text-gray-500">No users found matching "{searchQuery}"</p>
          )}
        </div>

        {/* Blocked Users List */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Currently Blocked ({blockedUsers.length})
          </h3>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#37a653]"></div>
            </div>
          ) : blockedUsers.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              <p className="text-gray-500">No blocked users</p>
              <p className="text-sm text-gray-400 mt-1">Users you block will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {blockedUsers.map((blockedUser) => (
                <div key={blockedUser.blocked_id} className="p-4 border border-gray-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center">
                    <img
                      src={
                        blockedUser.blocked_user?.avatar_url || 
                        AvatarService.getDefaultAvatar(blockedUser.blocked_user?.username || 'User')
                      }
                      alt={`${blockedUser.blocked_user?.username || 'User'}'s avatar`}
                      className="w-10 h-10 rounded-full mr-4"
                    />
                    <div>
                      <p className="font-medium text-gray-900">
                        {blockedUser.blocked_user?.username || 'Unknown User'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Blocked on {formatDate(blockedUser.blocked_at)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnblockUser(blockedUser)}
                    disabled={isLoading}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BlockedUsers
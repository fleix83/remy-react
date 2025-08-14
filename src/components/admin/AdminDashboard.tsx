import React, { useState, useEffect } from 'react'
import { usePermissions } from '../../hooks/usePermissions'
import { ModerationService } from '../../services/moderation.service'
import type { User } from '../../types/database.types'

interface ModerationStats {
  totalUsers: number
  bannedUsers: number
  moderators: number
  admins: number
  totalPosts: number
  totalComments: number
}

const AdminDashboard: React.FC = () => {
  const permissions = usePermissions()
  const [stats, setStats] = useState<ModerationStats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'content'>('overview')
  const moderationService = new ModerationService()

  useEffect(() => {
    if (permissions.canModerate) {
      loadDashboardData()
    }
  }, [permissions.canModerate])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [statsData, usersData] = await Promise.all([
        moderationService.getModerationStats(),
        moderationService.getUsers(50, 0)
      ])
      
      setStats(statsData)
      setUsers(usersData)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUserRoleChange = async (userId: string, newRole: 'user' | 'moderator' | 'admin') => {
    try {
      await moderationService.updateUserRole(userId, newRole)
      await loadDashboardData() // Reload data
      alert('Benutzerrolle erfolgreich geändert')
    } catch (error) {
      console.error('Error changing user role:', error)
      alert('Fehler beim Ändern der Benutzerrolle')
    }
  }

  const handleBanUser = async (userId: string, shouldBan: boolean) => {
    try {
      if (shouldBan) {
        await moderationService.banUser(userId)
      } else {
        await moderationService.unbanUser(userId)
      }
      await loadDashboardData() // Reload data
      alert(`Benutzer ${shouldBan ? 'gesperrt' : 'entsperrt'}`)
    } catch (error) {
      console.error('Error banning/unbanning user:', error)
      alert('Fehler beim Sperren/Entsperren des Benutzers')
    }
  }

  // Redirect if no permissions
  if (!permissions.canModerate) {
    return (
      <div className="min-h-screen bg-[#1a3442] flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-2xl font-bold mb-4">Zugriff verweigert</h1>
          <p className="text-gray-300">Sie haben keine Berechtigung für diese Seite.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a3442] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#37a653]"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1a3442]">
      <div className="max-w-7xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            {permissions.isAdmin ? 'Admin Dashboard' : 'Moderator Dashboard'}
          </h1>
          <p className="text-gray-300">
            Verwalten Sie Benutzer, Inhalte und Einstellungen des Forums
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6 border-b border-[#2a4a57]">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-[#37a653] text-[#37a653]'
                  : 'border-transparent text-gray-300 hover:text-white hover:border-gray-300'
              }`}
            >
              Übersicht
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-[#37a653] text-[#37a653]'
                  : 'border-transparent text-gray-300 hover:text-white hover:border-gray-300'
              }`}
            >
              Benutzer
            </button>
            <button
              onClick={() => setActiveTab('content')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'content'
                  ? 'border-[#37a653] text-[#37a653]'
                  : 'border-transparent text-gray-300 hover:text-white hover:border-gray-300'
              }`}
            >
              Inhalte
            </button>
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-[#203f4a] rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-[#37a653] rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-300">Benutzer gesamt</p>
                  <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
                </div>
              </div>
            </div>

            <div className="bg-[#203f4a] rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-500 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-300">Gesperrte Benutzer</p>
                  <p className="text-2xl font-bold text-white">{stats.bannedUsers}</p>
                </div>
              </div>
            </div>

            <div className="bg-[#203f4a] rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-300">Beiträge gesamt</p>
                  <p className="text-2xl font-bold text-white">{stats.totalPosts}</p>
                </div>
              </div>
            </div>

            <div className="bg-[#203f4a] rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-500 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-300">Kommentare gesamt</p>
                  <p className="text-2xl font-bold text-white">{stats.totalComments}</p>
                </div>
              </div>
            </div>

            <div className="bg-[#203f4a] rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-[#37a653] rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-300">Moderatoren</p>
                  <p className="text-2xl font-bold text-white">{stats.moderators}</p>
                </div>
              </div>
            </div>

            <div className="bg-[#203f4a] rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-300">Admins</p>
                  <p className="text-2xl font-bold text-white">{stats.admins}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-[#203f4a] rounded-lg">
            <div className="px-6 py-4 border-b border-[#2a4a57]">
              <h2 className="text-lg font-semibold text-white">Benutzerverwaltung</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-[#1a3442]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Benutzer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Rolle</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Registriert</th>
                    {permissions.isAdmin && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Aktionen</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a4a57]">
                  {users.map((user) => (
                    <tr key={user.id} className="bg-[#203f4a]">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-[#37a653] rounded-full flex items-center justify-center mr-3">
                            <span className="text-white font-semibold text-sm">
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{user.username}</div>
                            <div className="text-sm text-gray-300">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : user.role === 'moderator' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role === 'admin' ? 'Admin' : user.role === 'moderator' ? 'Moderator' : 'Benutzer'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.is_banned ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {user.is_banned ? 'Gesperrt' : 'Aktiv'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {new Date(user.created_at).toLocaleDateString('de-DE')}
                      </td>
                      {permissions.isAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex space-x-2">
                            {!user.is_banned ? (
                              <button
                                onClick={() => handleBanUser(user.id, true)}
                                className="text-red-400 hover:text-red-300 transition-colors"
                              >
                                Sperren
                              </button>
                            ) : (
                              <button
                                onClick={() => handleBanUser(user.id, false)}
                                className="text-green-400 hover:text-green-300 transition-colors"
                              >
                                Entsperren
                              </button>
                            )}
                            <select
                              value={user.role}
                              onChange={(e) => handleUserRoleChange(user.id, e.target.value as 'user' | 'moderator' | 'admin')}
                              className="bg-[#1a3442] text-white text-sm rounded px-2 py-1 border border-[#2a4a57]"
                            >
                              <option value="user">Benutzer</option>
                              <option value="moderator">Moderator</option>
                              <option value="admin">Admin</option>
                            </select>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Content Tab */}
        {activeTab === 'content' && (
          <div className="bg-[#203f4a] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Inhaltsverwaltung</h2>
            <div className="text-gray-300">
              <p className="mb-4">Die Moderation von Beiträgen und Kommentaren erfolgt direkt über die jeweiligen Moderationsbuttons in den Inhalten.</p>
              <p>Als {permissions.isAdmin ? 'Administrator' : 'Moderator'} können Sie:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Beiträge und Kommentare bearbeiten</li>
                <li>Unangemessene Inhalte löschen</li>
                {permissions.isAdmin && <li>Benutzer sperren und Rollen verwalten</li>}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminDashboard
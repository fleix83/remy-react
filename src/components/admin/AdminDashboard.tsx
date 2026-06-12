import React, { useState, useEffect } from 'react'
import { usePermissions } from '../../hooks/usePermissions'
import { ModerationService } from '../../services/moderation.service'
import UserAvatar from '../user/UserAvatar'
import DesignationsTab from './DesignationsTab'
import TherapistsTab from './TherapistsTab'
import CategoriesTab from './CategoriesTab'
import CmsTab from './CmsTab'
import type { User } from '../../types/database.types'

interface ModerationStats {
  totalUsers: number
  bannedUsers: number
  moderators: number
  admins: number
  totalPosts: number
  totalComments: number
}

type TabId = 'overview' | 'users' | 'therapists' | 'designations' | 'categories' | 'cms'

// Outline icon paths (24x24, stroke) matching the app's icon style
const TAB_ICONS: Record<TabId, string> = {
  overview: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 8.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25A2.25 2.25 0 0113.5 8.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z',
  users: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z',
  therapists: 'M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z',
  designations: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
  categories: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
  cms: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
}

const AdminDashboard: React.FC = () => {
  const permissions = usePermissions()
  const [stats, setStats] = useState<ModerationStats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('overview')
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
      <div className="min-h-screen bg-[var(--bg-body)] flex items-center justify-center px-4">
        <div className="max-w-sm rounded-2xl border border-[#ece7dd] bg-white px-8 py-10 text-center shadow-[0_8px_30px_rgba(20,66,32,0.06)]">
          <h1 className="text-2xl font-bold text-[var(--type)] mb-2">Zugriff verweigert</h1>
          <p className="text-slate-500">Sie haben keine Berechtigung für diese Seite.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-body)] flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent"></div>
      </div>
    )
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Übersicht' },
    { id: 'users', label: 'Benutzer' },
    ...(permissions.isAdmin ? [{ id: 'therapists' as TabId, label: 'Therapeuten' }] : []),
    ...(permissions.isAdmin ? [{ id: 'designations' as TabId, label: 'Bezeichnungen' }] : []),
    ...(permissions.isAdmin ? [{ id: 'categories' as TabId, label: 'Kategorien' }] : []),
    ...(permissions.isAdmin ? [{ id: 'cms' as TabId, label: 'Cms' }] : []),
  ]

  return (
    <div className="min-h-screen bg-[var(--bg-body)]">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-left text-3xl font-bold text-[var(--primary)]">
            {permissions.isAdmin ? 'Admin Dashboard' : 'Moderator Dashboard'}
          </h1>
        </div>

        {/* Navigation Tabs — segmented control */}
        <div className="mb-8">
          <nav className="inline-flex flex-wrap gap-1 rounded-2xl border border-[#ece7dd] bg-white p-1.5 shadow-[0_2px_10px_rgba(20,66,32,0.05)]">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/50 focus-visible:ring-offset-1 focus-visible:ring-offset-white active:scale-[0.98] ${
                    isActive
                      ? 'bg-[var(--primary)] text-white shadow-[0_4px_12px_rgba(255,135,135,0.35)]'
                      : 'text-slate-600 hover:bg-[#eef3ff] hover:text-[var(--primary)]'
                  }`}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d={TAB_ICONS[tab.id]} />
                  </svg>
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {([
              { label: 'Benutzer gesamt', value: stats.totalUsers, color: '#C5D0FF', radius: '42% 58% 70% 30% / 45% 45% 55% 55%' },
              { label: 'Gesperrte Benutzer', value: stats.bannedUsers, color: '#FFC8C8', radius: '63% 37% 54% 46% / 55% 48% 52% 45%' },
              { label: 'Beiträge gesamt', value: stats.totalPosts, color: '#98FFC7', radius: '38% 62% 63% 37% / 41% 44% 56% 59%' },
              { label: 'Kommentare gesamt', value: stats.totalComments, color: '#ffeb99', radius: '50% 50% 33% 67% / 55% 38% 62% 45%' },
              { label: 'Moderatoren', value: stats.moderators, color: '#edd3ff', radius: '67% 33% 47% 53% / 37% 62% 38% 63%' },
              { label: 'Admins', value: stats.admins, color: '#bfead0', radius: '58% 42% 38% 62% / 63% 34% 66% 37%' },
            ]).map((stat) => (
              <div
                key={stat.label}
                className="flex items-center justify-between rounded-2xl border border-[#ece7dd] bg-white p-5 shadow-[0_2px_10px_rgba(20,66,32,0.04)] transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(20,66,32,0.09)]"
              >
                <div
                  className="h-12 w-12 shrink-0"
                  style={{
                    backgroundColor: stat.color,
                    borderRadius: stat.radius,
                  }}
                  aria-hidden="true"
                />
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                  <p className="mt-1.5 text-3xl font-bold tabular-nums text-[var(--type)]">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="overflow-hidden rounded-2xl border border-[#ece7dd] bg-white shadow-[0_2px_10px_rgba(20,66,32,0.04)]">
            <div className="flex items-center justify-between border-b border-[#efe9df] px-6 py-4">
              <h2 className="text-base font-bold text-[var(--type)]">Benutzerverwaltung</h2>
              <span className="rounded-full bg-[#eef3ff] px-2.5 py-0.5 text-xs font-semibold text-[var(--primary)]">{users.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-[#efe9df] bg-[#faf8f4]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Benutzer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Rolle</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Registriert</th>
                    {permissions.isAdmin && (
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Aktionen</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1ece3]">
                  {users.map((user) => (
                    <tr key={user.id} className="bg-white transition-colors hover:bg-[#faf8f4]">
                      <td className="px-4 py-4 whitespace-nowrap text-left">
                        <div className="flex items-center">
                          <div className="mr-3">
                            <UserAvatar
                              user={user}
                              size="small"
                            />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.username}</div>
                            <div className="text-sm text-gray-500">ID: {user.id.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
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
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.is_banned ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {user.is_banned ? 'Gesperrt' : 'Aktiv'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('de-DE') : 'Unbekannt'}
                      </td>
                      {permissions.isAdmin && (
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            {!user.is_banned ? (
                              <button
                                onClick={() => handleBanUser(user.id, true)}
                                className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
                              >
                                Sperren
                              </button>
                            ) : (
                              <button
                                onClick={() => handleBanUser(user.id, false)}
                                className="rounded-lg bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 transition-colors hover:bg-green-100"
                              >
                                Entsperren
                              </button>
                            )}
                            <select
                              value={user.role || 'user'}
                              onChange={(e) => handleUserRoleChange(user.id, e.target.value as 'user' | 'moderator' | 'admin')}
                              className="rounded-lg border border-[#e2ddd3] bg-white px-2 py-1 text-sm text-gray-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/50"
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

        {/* Therapists Tab */}
        {activeTab === 'therapists' && permissions.isAdmin && (
          <TherapistsTab />
        )}

        {/* Designations Tab */}
        {activeTab === 'designations' && permissions.isAdmin && (
          <DesignationsTab />
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && permissions.isAdmin && (
          <CategoriesTab />
        )}

        {/* CMS Tab */}
        {activeTab === 'cms' && permissions.isAdmin && (
          <CmsTab />
        )}
      </div>
    </div>
  )
}

export default AdminDashboard
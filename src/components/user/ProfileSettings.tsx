import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../../stores/auth.store'
import BadgeDropdown from '../ui/BadgeDropdown'

const ProfileSettings: React.FC = () => {
  const { userProfile, updateProfile } = useAuthStore()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    bio: '',
    default_canton: '',
    language_preference: '',
    messages_active: false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const cantons = [
    { value: '', label: 'Kanton auswählen' },
    { value: 'AG', label: 'Aargau' },
    { value: 'AI', label: 'Appenzell Innerrhoden' },
    { value: 'AR', label: 'Appenzell Ausserrhoden' },
    { value: 'BE', label: 'Bern' },
    { value: 'BL', label: 'Basel-Landschaft' },
    { value: 'BS', label: 'Basel-Stadt' },
    { value: 'FR', label: 'Freiburg' },
    { value: 'GE', label: 'Genf' },
    { value: 'GL', label: 'Glarus' },
    { value: 'GR', label: 'Graubünden' },
    { value: 'JU', label: 'Jura' },
    { value: 'LU', label: 'Luzern' },
    { value: 'NE', label: 'Neuenburg' },
    { value: 'NW', label: 'Nidwalden' },
    { value: 'OW', label: 'Obwalden' },
    { value: 'SG', label: 'St. Gallen' },
    { value: 'SH', label: 'Schaffhausen' },
    { value: 'SO', label: 'Solothurn' },
    { value: 'SZ', label: 'Schwyz' },
    { value: 'TG', label: 'Thurgau' },
    { value: 'TI', label: 'Tessin' },
    { value: 'UR', label: 'Uri' },
    { value: 'VD', label: 'Waadt' },
    { value: 'VS', label: 'Wallis' },
    { value: 'ZG', label: 'Zug' },
    { value: 'ZH', label: 'Zürich' }
  ]

  const languages = [
    { value: 'de', label: 'Deutsch' },
    { value: 'fr', label: 'Français' },
    { value: 'it', label: 'Italiano' }
  ]

  useEffect(() => {
    if (userProfile) {
      setFormData({
        username: userProfile.username || '',
        bio: userProfile.bio || '',
        default_canton: userProfile.default_canton || '',
        language_preference: userProfile.language_preference || 'de',
        messages_active: userProfile.messages_active ?? true
      })
    }
  }, [userProfile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userProfile) return

    setIsLoading(true)
    setMessage(null)

    try {
      await updateProfile({
        username: formData.username,
        bio: formData.bio,
        default_canton: formData.default_canton || null,
        language_preference: formData.language_preference,
        messages_active: formData.messages_active
      })

      setMessage({ type: 'success', text: 'Settings updated successfully!' })
      setIsEditing(false)
    } catch (error) {
      console.error('Profile update error:', error)
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to update settings' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    if (userProfile) {
      setFormData({
        username: userProfile.username || '',
        bio: userProfile.bio || '',
        default_canton: userProfile.default_canton || '',
        language_preference: userProfile.language_preference || 'de',
        messages_active: userProfile.messages_active ?? true
      })
    }
    setIsEditing(false)
    setMessage(null)
  }

  if (!userProfile) return null

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Profile Settings</h2>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-[#2ebe7a] hover:text-[#2d8544] font-medium text-sm transition-colors duration-200"
            >
              Edit Settings
            </button>
          )}
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2ebe7a] focus:border-transparent"
                  required
                />
              ) : (
                <p className="text-gray-900">{userProfile.username}</p>
              )}
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              {isEditing ? (
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2ebe7a] focus:border-transparent resize-none"
                  placeholder="Tell us a bit about yourself..."
                />
              ) : (
                <p className="text-gray-900 whitespace-pre-wrap">
                  {userProfile.bio || <span className="text-gray-500 italic">No bio provided</span>}
                </p>
              )}
            </div>

            {/* Private Settings Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Private Settings</h3>
              
              <div className="space-y-4">
                {/* Default Canton */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Canton
                  </label>
                  {isEditing ? (
                    <BadgeDropdown
                      value={formData.default_canton}
                      options={cantons}
                      onChange={(value) => setFormData({ ...formData, default_canton: value as string })}
                      badgeClassName="bg-gray-100 text-gray-800 hover:bg-gray-200"
                      placeholder="Select canton..."
                    />
                  ) : (
                    <p className="text-gray-900">
                      {cantons.find(c => c.value === userProfile.default_canton)?.label || 
                       <span className="text-gray-500 italic">No default canton set</span>}
                    </p>
                  )}
                </div>

                {/* Language Preference */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Language
                  </label>
                  {isEditing ? (
                    <BadgeDropdown
                      value={formData.language_preference}
                      options={languages}
                      onChange={(value) => setFormData({ ...formData, language_preference: value as string })}
                      badgeClassName="bg-blue-100 text-blue-800 hover:bg-blue-200"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {languages.find(l => l.value === userProfile.language_preference)?.label || 'Deutsch'}
                    </p>
                  )}
                </div>

                {/* Messages Toggle */}
                <div>
                  <label className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Allow private messages
                    </span>
                    {isEditing ? (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, messages_active: !formData.messages_active })}
                        className={`
                          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#2ebe7a] focus:ring-offset-2
                          ${formData.messages_active ? 'bg-[#2ebe7a]' : 'bg-gray-200'}
                        `}
                      >
                        <span
                          className={`
                            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
                            transition duration-200 ease-in-out
                            ${formData.messages_active ? 'translate-x-5' : 'translate-x-0'}
                          `}
                        />
                      </button>
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        userProfile.messages_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {userProfile.messages_active ? 'Enabled' : 'Disabled'}
                      </span>
                    )}
                  </label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {isEditing && (
              <div className="flex gap-3 pt-6 border-t">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-[#2ebe7a] hover:bg-[#2d8544] text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProfileSettings
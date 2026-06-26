import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/auth.store'
import BadgeDropdown from '../ui/BadgeDropdown'
import i18n from '../../i18n'
import { SWISS_CANTONS } from '../../constants/switzerland.constants'

interface ProfileSettingsProps {
  isEditing?: boolean
  onEditingChange?: (editing: boolean) => void
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ 
  isEditing: propIsEditing = false, 
  onEditingChange 
}) => {
  const { t } = useTranslation('profile')
  const { userProfile, updateProfile } = useAuthStore()
  const [isEditing, setIsEditing] = useState(propIsEditing)
  const [formData, setFormData] = useState({
    username: '',
    bio: '',
    default_canton: '',
    language_preference: '',
    messages_active: false,
    post_history_public: true
  })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Map SWISS_CANTONS to the format expected by BadgeDropdown.
  // Real canton codes get a translated name; the empty placeholder keeps its
  // original label (no cantons.'' key exists).
  const cantons = SWISS_CANTONS.map(canton => ({
    value: canton.code,
    label: canton.code ? t(`common:cantons.${canton.code}`) : canton.name
  }))

  const languages = [
    { value: 'de', label: 'Deutsch' },
    { value: 'fr', label: 'Français' },
    { value: 'it', label: 'Italiano' },
    { value: 'en', label: 'English' }
  ]

  useEffect(() => {
    if (userProfile) {
      setFormData({
        username: userProfile.username || '',
        bio: userProfile.bio || '',
        default_canton: userProfile.default_canton || '',
        language_preference: userProfile.language_preference || 'de',
        messages_active: userProfile.messages_active ?? true,
        post_history_public: userProfile.post_history_public ?? true
      })
    }
  }, [userProfile])

  useEffect(() => {
    setIsEditing(propIsEditing)
  }, [propIsEditing])

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
        messages_active: formData.messages_active,
        post_history_public: formData.post_history_public
      })

      setMessage({ type: 'success', text: t('settings.updateSuccess') })
      setIsEditing(false)
      if (onEditingChange) onEditingChange(false)
    } catch (error) {
      console.error('Profile update error:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : t('settings.updateError')
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
        messages_active: userProfile.messages_active ?? true,
        post_history_public: userProfile.post_history_public ?? true
      })
    }
    setIsEditing(false)
    setMessage(null)
    if (onEditingChange) onEditingChange(false)
  }

  if (!userProfile) return null

  return (
    <div className="bg-white shadow-sm" style={{ borderRadius: '28px' }}>
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 text-left">{t('settings.title')}</h2>
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
              <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                {t('settings.username')}
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-left"
                  required
                />
              ) : (
                <p className="text-gray-900 text-left">{userProfile.username}</p>
              )}
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                {t('settings.bio')}
              </label>
              {isEditing ? (
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent resize-none text-left"
                  placeholder={t('settings.bioPlaceholder')}
                />
              ) : (
                <p className="text-gray-900 whitespace-pre-wrap text-left">
                  {userProfile.bio || <span className="text-gray-500 italic">{t('settings.noBio')}</span>}
                </p>
              )}
            </div>

            {/* Private Settings Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 text-left">{t('settings.privateSettings')}</h3>
              
              <div className="space-y-3">
                {/* Default Canton */}
                <div className="flex items-center">
                  <div className="w-40 text-left">
                    <span className="text-sm font-medium text-gray-700">
                      {t('settings.defaultRegion')}
                    </span>
                  </div>
                  <div className="flex-1 text-left">
                    {isEditing ? (
                      <BadgeDropdown
                        value={formData.default_canton}
                        options={cantons}
                        onChange={(value) => setFormData({ ...formData, default_canton: value as string })}
                        badgeClassName="bg-blue-100 text-blue-800 hover:bg-blue-200"
                        placeholder={t('settings.allCantons')}
                      />
                    ) : (
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {cantons.find(c => c.value === userProfile.default_canton)?.label || t('settings.allCantons')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Language Preference */}
                <div className="flex items-center">
                  <div className="w-40 text-left">
                    <span className="text-sm font-medium text-gray-700">
                      {t('settings.preferredLanguage')}
                    </span>
                  </div>
                  <div className="flex-1 text-left">
                    {isEditing ? (
                      <BadgeDropdown
                        value={formData.language_preference}
                        options={languages}
                        onChange={(value) => {
                          setFormData({ ...formData, language_preference: value as string })
                          void i18n.changeLanguage(value as string)
                        }}
                        badgeClassName="bg-gray-100 text-gray-800 hover:bg-gray-200"
                      />
                    ) : (
                      <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                        {languages.find(l => l.value === userProfile.language_preference)?.label || 'Deutsch'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Post History Visibility */}
                <div className="flex items-center">
                  <div className="w-40 text-left">
                    <span className="text-sm font-medium text-gray-700">
                      {t('settings.postHistory')}
                    </span>
                  </div>
                  <div className="flex-1 text-left">
                    {isEditing ? (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, post_history_public: !formData.post_history_public })}
                        className={`
                          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
                          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2
                          ${formData.post_history_public ? 'bg-[var(--primary)]' : 'bg-gray-200'}
                        `}
                      >
                        <span
                          className={`
                            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
                            transition duration-200 ease-in-out
                            ${formData.post_history_public ? 'translate-x-5' : 'translate-x-0'}
                          `}
                        />
                      </button>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        (userProfile.post_history_public ?? true)
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {(userProfile.post_history_public ?? true) ? t('settings.public') : t('settings.private')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Messages Toggle */}
                <div className="flex items-center">
                  <div className="w-40 text-left">
                    <span className="text-sm font-medium text-gray-700">
                      {t('settings.privateMessages')}
                    </span>
                  </div>
                  <div className="flex-1 text-left">
                    {isEditing ? (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, messages_active: !formData.messages_active })}
                        className={`
                          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2
                          ${formData.messages_active ? 'bg-[var(--primary)]' : 'bg-gray-200'}
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
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        userProfile.messages_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {userProfile.messages_active ? t('settings.on') : t('settings.off')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {isEditing && (
              <div className="flex gap-3 pt-6 border-t">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-[var(--primary)] hover:bg-[#2d8544] text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? t('settings.saving') : t('settings.saveChanges')}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common:actions.cancel')}
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
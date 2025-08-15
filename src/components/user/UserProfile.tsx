import React, { useState } from 'react'
import { useAuthStore } from '../../stores/auth.store'
import UserAvatar from './UserAvatar'
import ProfileSettings from './ProfileSettings'
import BlockedUsers from './BlockedUsers'
import UserContent from './UserContent'

const UserProfile: React.FC = () => {
  const { user, userProfile } = useAuthStore()
  const [showSettings, setShowSettings] = useState(false)
  
  if (!user || !userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#37a653] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Container with Overlapping Avatar */}
        <div className="relative">
          {/* Background Header */}
          <div className="bg-gradient-to-r from-[#37a653] to-[#2d8544] rounded-lg h-48 relative overflow-hidden">
          </div>
          
          {/* Overlapping Avatar */}
          <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2">
            <UserAvatar 
              user={userProfile}
              size="large"
              showUpload={true}
            />
          </div>
          
          {/* Edit Button */}
          <div className="absolute top-4 right-4">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="bg-white/90 hover:bg-white text-[#37a653] px-4 py-2 rounded-lg font-medium text-sm transition-colors duration-200 flex items-center shadow-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Profile
            </button>
          </div>
        </div>

        {/* Public Profile Information */}
        <div className="mt-20 bg-white rounded-lg shadow-sm p-6">
          <div className="text-left">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {userProfile.username}
            </h1>
            <p className="text-gray-500 mb-4">
              Member since {formatDate(userProfile.created_at)}
            </p>
            
            {userProfile.bio && (
              <div>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {userProfile.bio}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Settings Section */}
        {showSettings && (
          <div className="mt-6 space-y-6">
            <ProfileSettings />
            <BlockedUsers />
          </div>
        )}

        {/* User Content */}
        <div className="mt-6">
          <UserContent userId={userProfile.id} />
        </div>
      </div>
    </div>
  )
}

export default UserProfile
// Manual bucket creation utility
// Run this in browser console with admin privileges

import { supabase } from '../lib/supabase.js'

export async function createAvatarBucket() {
  try {
    console.log('Creating avatars bucket...')
    
    const { data, error } = await supabase.storage.createBucket('avatars', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      fileSizeLimit: 5242880 // 5MB
    })

    if (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Bucket already exists')
        return { success: true, message: 'Bucket already exists' }
      } else {
        console.error('❌ Error creating bucket:', error)
        return { success: false, error }
      }
    }

    console.log('✅ Bucket created successfully:', data)
    return { success: true, data }
  } catch (error) {
    console.error('❌ Failed to create bucket:', error)
    return { success: false, error }
  }
}

// Usage in browser console:
// import('./utils/create-avatar-bucket.js').then(({ createAvatarBucket }) => createAvatarBucket())
import AvatarService from '../services/avatar.service'

// Utility to set up Supabase storage buckets
export async function setupStorage() {
  try {
    console.log('Setting up storage buckets...')
    await AvatarService.createAvatarBucket()
    console.log('✅ Avatar bucket created successfully')
    return { success: true }
  } catch (error) {
    console.error('❌ Failed to set up storage:', error)
    return { success: false, error }
  }
}

// Call this function in browser console if needed:
// import { setupStorage } from './utils/setup-storage'
// setupStorage()
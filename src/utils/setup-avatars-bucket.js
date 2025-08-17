// Browser console utility to create avatars bucket
// Run this in the browser console when logged in as admin

import { supabase } from '../lib/supabase.js'

export async function setupAvatarsBucket() {
  try {
    console.log('🔍 Checking existing buckets...')
    
    // List existing buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError)
      return { success: false, error: listError }
    }
    
    console.log('📋 Existing buckets:', buckets?.map(b => b.name) || [])
    
    // Check if avatars bucket already exists
    const existingBucket = buckets?.find(bucket => bucket.name === 'avatars')
    if (existingBucket) {
      console.log('✅ Avatars bucket already exists!')
      return { success: true, message: 'Bucket already exists' }
    }
    
    console.log('🚀 Creating avatars bucket...')
    
    // Create the bucket
    const { data: createData, error: createError } = await supabase.storage.createBucket('avatars', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      fileSizeLimit: 5242880 // 5MB
    })
    
    if (createError) {
      if (createError.message.includes('already exists')) {
        console.log('✅ Bucket already exists (from createBucket call)')
        return { success: true, message: 'Bucket already exists' }
      } else {
        console.error('❌ Error creating bucket:', createError)
        return { success: false, error: createError }
      }
    }
    
    console.log('✅ Bucket created successfully:', createData)
    
    // Verify creation
    const { data: verifyBuckets } = await supabase.storage.listBuckets()
    const avatarBucket = verifyBuckets?.find(bucket => bucket.name === 'avatars')
    
    if (avatarBucket) {
      console.log('✅ Bucket creation verified!')
      return { success: true, data: createData }
    } else {
      console.error('❌ Bucket creation could not be verified')
      return { success: false, error: 'Bucket creation could not be verified' }
    }
    
  } catch (error) {
    console.error('❌ Failed to set up avatars bucket:', error)
    return { success: false, error }
  }
}

// Auto-run when imported
console.log('Avatar bucket setup utility loaded. Call setupAvatarsBucket() to create the bucket.')

// For direct browser console use:
window.setupAvatarsBucket = setupAvatarsBucket
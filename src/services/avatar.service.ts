import { supabase } from '../lib/supabase'
import { processImageForUpload, FILE_INPUT_ACCEPT, ACCEPTED_IMAGE_TYPES } from '../utils/image-processing'

export class AvatarService {
  private static readonly BUCKET_NAME = 'avatars'
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
  
  // Export for use in components
  static readonly FILE_INPUT_ACCEPT = FILE_INPUT_ACCEPT
  static readonly ACCEPTED_IMAGE_TYPES = ACCEPTED_IMAGE_TYPES

  static async uploadAvatar(userId: string, file: File): Promise<string> {
    console.log(`Starting avatar upload for user ${userId}, file:`, {
      name: file.name,
      type: file.type,
      size: file.size
    })

    try {
      // Process image (handles iOS HEIC conversion and validation)
      const { file: processedFile, wasConverted } = await processImageForUpload(
        file,
        this.MAX_FILE_SIZE / (1024 * 1024) // Convert to MB
      )
      
      if (wasConverted) {
        console.log('Image was converted for web compatibility')
      }

      // Create unique filename (always use processed file's extension)
      const fileExt = processedFile.name.split('.').pop()
      const fileName = `${userId}-${Date.now()}.${fileExt}`
      const filePath = `${userId}/${fileName}`

      console.log(`Uploading to path: ${filePath}`)

      // Upload file to Supabase Storage
      console.log('Attempting file upload...')
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, processedFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: processedFile.type
        })

      if (uploadError) {
        console.error('Upload error details:', uploadError)
        
        if (uploadError.message.includes('Bucket not found')) {
          throw new Error('Avatar storage is not set up. Please contact the administrator to create the "avatars" storage bucket in Supabase.')
        } else if (uploadError.message.includes('new row violates row-level security')) {
          throw new Error('Permission denied. Please ensure the storage policies are set up correctly.')
        } else {
          throw new Error(`Upload failed: ${uploadError.message}`)
        }
      }

      console.log('Upload successful:', uploadData)

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath)

      console.log('Generated public URL:', publicUrl)

      // Update user profile with new avatar URL
      console.log('Updating user profile...')
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (updateError) {
        console.error('Profile update error:', updateError)
        throw new Error(`Failed to update profile: ${updateError.message}`)
      }

      console.log('Avatar upload completed successfully')
      return publicUrl
    } catch (error) {
      console.error('Avatar upload error:', error)
      throw error
    }
  }

  static async deleteAvatar(userId: string, avatarUrl: string): Promise<void> {
    try {
      // Extract file path from URL
      const urlParts = avatarUrl.split('/')
      const fileName = urlParts[urlParts.length - 1]
      const filePath = `${userId}/${fileName}`

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filePath])

      if (deleteError) {
        console.error('Error deleting avatar file:', deleteError)
        // Don't throw - we still want to update the profile
      }

      // Update user profile to remove avatar URL
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          avatar_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (updateError) {
        throw new Error(`Failed to update profile: ${updateError.message}`)
      }
    } catch (error) {
      console.error('Avatar deletion error:', error)
      throw error
    }
  }

  static async uploadBackground(userId: string, file: File): Promise<string> {
    console.log(`Starting background upload for user ${userId}, file:`, {
      name: file.name,
      type: file.type,
      size: file.size
    })

    try {
      // Process image (handles iOS HEIC conversion and validation)
      const { file: processedFile, wasConverted } = await processImageForUpload(
        file,
        this.MAX_FILE_SIZE / (1024 * 1024) // Convert to MB
      )
      
      if (wasConverted) {
        console.log('Image was converted for web compatibility')
      }

      // Create unique filename
      const fileExt = processedFile.name.split('.').pop()
      const fileName = `background-${Date.now()}.${fileExt}`
      const filePath = `${userId}/${fileName}`

      console.log(`Uploading to path: ${filePath}`)

      // Upload file to Supabase Storage
      console.log('Attempting file upload...')
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, processedFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: processedFile.type
        })

      if (uploadError) {
        console.error('Upload error details:', uploadError)

        if (uploadError.message.includes('Bucket not found')) {
          throw new Error('Background storage is not set up. Please contact the administrator.')
        } else if (uploadError.message.includes('new row violates row-level security')) {
          throw new Error('Permission denied. Please ensure the storage policies are set up correctly.')
        } else {
          throw new Error(`Upload failed: ${uploadError.message}`)
        }
      }

      console.log('Upload successful:', uploadData)

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath)

      console.log('Generated public URL:', publicUrl)

      // Update user profile with new background URL
      console.log('Updating user profile...')
      const { error: updateError } = await supabase
        .from('users')
        .update({
          background_image_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (updateError) {
        console.error('Profile update error:', updateError)
        throw new Error(`Failed to update profile: ${updateError.message}`)
      }

      console.log('Background upload completed successfully')
      return publicUrl
    } catch (error) {
      console.error('Background upload error:', error)
      throw error
    }
  }

  static async deleteBackground(userId: string, backgroundUrl: string): Promise<void> {
    try {
      // Extract file path from URL
      const urlParts = backgroundUrl.split('/')
      const fileName = urlParts[urlParts.length - 1]
      const filePath = `${userId}/${fileName}`

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filePath])

      if (deleteError) {
        console.error('Error deleting background file:', deleteError)
        // Don't throw - we still want to update the profile
      }

      // Update user profile to remove background URL
      const { error: updateError } = await supabase
        .from('users')
        .update({
          background_image_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (updateError) {
        throw new Error(`Failed to update profile: ${updateError.message}`)
      }
    } catch (error) {
      console.error('Background deletion error:', error)
      throw error
    }
  }

  static getDefaultAvatar(username: string): string {
    // Generate a simple identicon-style avatar based on username
    // Handle undefined/null username gracefully
    const safeUsername = username || 'User'
    const firstLetter = safeUsername.charAt(0).toUpperCase()
    const colorIndex = safeUsername.charCodeAt(0) % 6
    const colors = [
      '#2ebe7a', '#2563eb', '#dc2626', '#ea580c',
      '#7c3aed', '#0891b2'
    ]

    return `data:image/svg+xml,${encodeURIComponent(`
      <svg width="120" height="120" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="120" fill="${colors[colorIndex]}"/>
        <text x="60" y="75" text-anchor="middle" fill="white" font-size="48" font-family="Arial, sans-serif" font-weight="bold">
          ${firstLetter}
        </text>
      </svg>
    `)}`
  }

  static async createAvatarBucket(): Promise<void> {
    // This would be run once during setup
    const { error } = await supabase.storage.createBucket(this.BUCKET_NAME, {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      fileSizeLimit: this.MAX_FILE_SIZE
    })

    if (error && !error.message.includes('already exists')) {
      throw new Error(`Failed to create avatar bucket: ${error.message}`)
    }
  }
}

export default AvatarService

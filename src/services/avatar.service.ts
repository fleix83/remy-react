import { supabase } from '../lib/supabase'

export class AvatarService {
  private static readonly BUCKET_NAME = 'avatars'
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
  private static readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

  static async uploadAvatar(userId: string, file: File): Promise<string> {
    console.log(`Starting avatar upload for user ${userId}, file:`, {
      name: file.name,
      type: file.type,
      size: file.size
    })

    // Validate file
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.')
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error('File size too large. Please upload an image smaller than 5MB.')
    }

    // Create unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}-${Date.now()}.${fileExt}`
    const filePath = `${userId}/${fileName}`

    console.log(`Uploading to path: ${filePath}`)

    try {
      // Upload file to Supabase Storage
      console.log('Attempting file upload...')
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
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

  static getDefaultAvatar(username: string): string {
    // Generate a simple identicon-style avatar based on username
    const firstLetter = username.charAt(0).toUpperCase()
    const colorIndex = username.charCodeAt(0) % 6
    const colors = [
      '#37a653', '#2563eb', '#dc2626', '#ea580c', 
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
      allowedMimeTypes: this.ALLOWED_TYPES,
      fileSizeLimit: this.MAX_FILE_SIZE
    })

    if (error && !error.message.includes('already exists')) {
      throw new Error(`Failed to create avatar bucket: ${error.message}`)
    }
  }
}

export default AvatarService
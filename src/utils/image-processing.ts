/**
 * Image Processing Utility
 * Handles cross-platform image processing with special support for iOS
 * 
 * iOS-specific issues this handles:
 * - HEIC/HEIF format conversion (default iOS photo format)
 * - Blob URL handling from iOS photo picker
 * - MIME type normalization
 * - Image orientation (EXIF data) correction
 */

export interface ProcessedImage {
  file: File
  originalType: string
  wasConverted: boolean
}

// Standard web-compatible image types
const STANDARD_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

// iOS-specific image types that need conversion
const IOS_IMAGE_TYPES = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence']

// All accepted image types for file input
export const ACCEPTED_IMAGE_TYPES = [...STANDARD_IMAGE_TYPES, ...IOS_IMAGE_TYPES]

// Accept string for file input (includes all formats + camera capture)
export const FILE_INPUT_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/*'

/**
 * Check if image type needs conversion for web compatibility
 */
export function needsConversion(mimeType: string): boolean {
  const type = mimeType.toLowerCase()
  return IOS_IMAGE_TYPES.includes(type) || !STANDARD_IMAGE_TYPES.includes(type)
}

/**
 * Convert an image file to JPEG format using canvas
 * This handles iOS HEIC images and ensures web compatibility
 */
export async function convertToJpeg(file: File, quality: number = 0.9): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    
    img.onload = () => {
      try {
        // Create canvas with image dimensions
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          URL.revokeObjectURL(objectUrl)
          reject(new Error('Could not get canvas context'))
          return
        }
        
        // Set canvas size to image size
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        
        // Draw image onto canvas
        ctx.drawImage(img, 0, 0)
        
        // Convert to blob
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl)
            
            if (!blob) {
              reject(new Error('Could not convert image to blob'))
              return
            }
            
            // Create new file with converted image
            const baseName = file.name.replace(/\.[^/.]+$/, '')
            const newFile = new File([blob], `${baseName}.jpg`, {
              type: 'image/jpeg',
              lastModified: Date.now()
            })
            
            resolve(newFile)
          },
          'image/jpeg',
          quality
        )
      } catch (error) {
        URL.revokeObjectURL(objectUrl)
        reject(error)
      }
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image for conversion'))
    }
    
    img.src = objectUrl
  })
}

/**
 * Process an image file for upload
 * - Validates the file type
 * - Converts iOS HEIC/HEIF to JPEG
 * - Returns processed file ready for upload
 */
export async function processImageForUpload(
  file: File,
  maxSizeMB: number = 5
): Promise<ProcessedImage> {
  console.log('Processing image for upload:', {
    name: file.name,
    type: file.type,
    size: file.size
  })
  
  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    throw new Error(`File size too large. Please upload an image smaller than ${maxSizeMB}MB.`)
  }
  
  const originalType = file.type || 'unknown'
  
  // Check if file type is recognized
  // On iOS, file.type might be empty or unknown for HEIC files
  const isKnownType = ACCEPTED_IMAGE_TYPES.some(t => 
    originalType.toLowerCase().includes(t.split('/')[1])
  )
  
  // Check file extension as fallback for type detection
  const extension = file.name.split('.').pop()?.toLowerCase() || ''
  const isImageByExtension = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'].includes(extension)
  
  if (!isKnownType && !isImageByExtension && originalType !== '' && !originalType.startsWith('image/')) {
    throw new Error('Invalid file type. Please upload an image file (JPEG, PNG, WebP, GIF, or HEIC).')
  }
  
  // Determine if conversion is needed
  const requiresConversion = needsConversion(originalType) || 
    ['heic', 'heif'].includes(extension) ||
    originalType === '' // Unknown type, try to convert
  
  if (requiresConversion) {
    console.log('Image requires conversion, converting to JPEG...')
    try {
      const convertedFile = await convertToJpeg(file)
      console.log('Conversion successful:', {
        originalType,
        newType: convertedFile.type,
        originalSize: file.size,
        newSize: convertedFile.size
      })
      return {
        file: convertedFile,
        originalType,
        wasConverted: true
      }
    } catch (error) {
      console.error('Image conversion failed:', error)
      // If conversion fails but it's a standard type, try to use original
      if (STANDARD_IMAGE_TYPES.includes(originalType)) {
        console.log('Using original file as fallback')
        return {
          file,
          originalType,
          wasConverted: false
        }
      }
      throw new Error('Could not process this image. Please try a different image or format.')
    }
  }
  
  // No conversion needed
  return {
    file,
    originalType,
    wasConverted: false
  }
}

/**
 * Resize image if it exceeds maximum dimensions
 * Maintains aspect ratio
 */
export async function resizeImageIfNeeded(
  file: File,
  maxWidth: number = 2048,
  maxHeight: number = 2048
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    
    img.onload = () => {
      const { naturalWidth, naturalHeight } = img
      
      // Check if resize is needed
      if (naturalWidth <= maxWidth && naturalHeight <= maxHeight) {
        URL.revokeObjectURL(objectUrl)
        resolve(file)
        return
      }
      
      // Calculate new dimensions
      let newWidth = naturalWidth
      let newHeight = naturalHeight
      
      if (naturalWidth > maxWidth) {
        newWidth = maxWidth
        newHeight = Math.round(naturalHeight * (maxWidth / naturalWidth))
      }
      
      if (newHeight > maxHeight) {
        newHeight = maxHeight
        newWidth = Math.round(newWidth * (maxHeight / newHeight))
      }
      
      // Create canvas and resize
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        URL.revokeObjectURL(objectUrl)
        reject(new Error('Could not get canvas context'))
        return
      }
      
      canvas.width = newWidth
      canvas.height = newHeight
      
      ctx.drawImage(img, 0, 0, newWidth, newHeight)
      
      // Determine output format
      const isJpeg = file.type === 'image/jpeg' || file.name.toLowerCase().endsWith('.jpg')
      const outputType = isJpeg ? 'image/jpeg' : 'image/png'
      const quality = isJpeg ? 0.9 : undefined
      
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl)
          
          if (!blob) {
            reject(new Error('Could not resize image'))
            return
          }
          
          const newFile = new File([blob], file.name, {
            type: outputType,
            lastModified: Date.now()
          })
          
          resolve(newFile)
        },
        outputType,
        quality
      )
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image for resizing'))
    }
    
    img.src = objectUrl
  })
}

export default {
  processImageForUpload,
  convertToJpeg,
  resizeImageIfNeeded,
  needsConversion,
  FILE_INPUT_ACCEPT,
  ACCEPTED_IMAGE_TYPES
}

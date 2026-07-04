/**
 * Image Processing Utility
 * Handles cross-platform image processing with special support for iOS
 * 
 * iOS-specific issues this handles:
 * - HEIC/HEIF format conversion (default iOS photo format)
 * - Blob URL handling from iOS photo picker
 * - MIME type normalization
 * - Files selected from iOS Files app (raw HEIC that browser can't decode)
 */

import heic2any from 'heic2any'

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

export interface ResizeOptions {
  maxWidth: number
  maxHeight: number
  quality: number
}

/**
 * Scale dimensions to fit within a bounding box, preserving aspect ratio.
 * Never upscales; never returns less than 1px per side.
 */
export function fitWithin(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const scale = Math.min(maxWidth / width, maxHeight / height, 1)
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  }
}

/**
 * Check if file is a HEIC/HEIF image based on type or extension
 */
function isHeicFile(file: File): boolean {
  const type = file.type.toLowerCase()
  const extension = file.name.split('.').pop()?.toLowerCase() || ''
  
  return (
    IOS_IMAGE_TYPES.includes(type) ||
    type === '' && ['heic', 'heif'].includes(extension) ||
    ['heic', 'heif'].includes(extension)
  )
}

/**
 * Check if image type needs conversion for web compatibility
 */
export function needsConversion(mimeType: string): boolean {
  const type = mimeType.toLowerCase()
  return IOS_IMAGE_TYPES.includes(type) || !STANDARD_IMAGE_TYPES.includes(type)
}

/**
 * Convert HEIC/HEIF file to JPEG using heic2any library
 * This is necessary for iOS Files app uploads where Safari can't decode HEIC natively
 */
async function convertHeicToJpeg(file: File, quality: number = 0.9): Promise<File> {
  console.log('Converting HEIC to JPEG using heic2any...')
  
  try {
    const result = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality
    })
    
    // heic2any can return a single blob or array of blobs
    const blob = Array.isArray(result) ? result[0] : result
    
    // Create new file from blob
    const baseName = file.name.replace(/\.[^/.]+$/, '')
    const newFile = new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now()
    })
    
    console.log('HEIC conversion successful:', {
      originalSize: file.size,
      newSize: newFile.size
    })
    
    return newFile
  } catch (error) {
    console.error('heic2any conversion failed:', error)
    throw new Error('Could not convert HEIC image. Please try a different image.')
  }
}

/**
 * Convert an image file to JPEG format using canvas
 * This handles standard image formats that need conversion
 */
export async function convertToJpeg(file: File, quality: number = 0.9): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    
    // Set a timeout for image loading (iOS sometimes hangs)
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Image loading timed out'))
    }, 10000)
    
    img.onload = () => {
      clearTimeout(timeout)
      try {
        // Check if image actually loaded with dimensions
        if (img.naturalWidth === 0 || img.naturalHeight === 0) {
          URL.revokeObjectURL(objectUrl)
          reject(new Error('Image loaded with zero dimensions'))
          return
        }
        
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
      clearTimeout(timeout)
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image for conversion'))
    }
    
    img.src = objectUrl
  })
}

/**
 * Read file header bytes to detect actual file type
 * This helps when iOS doesn't provide correct MIME type
 */
async function detectFileType(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    
    reader.onloadend = () => {
      const arr = new Uint8Array(reader.result as ArrayBuffer)
      
      // Check for HEIC/HEIF magic bytes
      // HEIC files start with 'ftyp' at offset 4, followed by 'heic', 'heix', 'hevc', 'mif1', etc.
      if (arr.length >= 12) {
        const ftypOffset = 4
        const ftyp = String.fromCharCode(arr[ftypOffset], arr[ftypOffset+1], arr[ftypOffset+2], arr[ftypOffset+3])
        
        if (ftyp === 'ftyp') {
          const brand = String.fromCharCode(arr[8], arr[9], arr[10], arr[11])
          if (['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1'].includes(brand)) {
            resolve('image/heic')
            return
          }
        }
      }
      
      // Check for JPEG
      if (arr[0] === 0xFF && arr[1] === 0xD8 && arr[2] === 0xFF) {
        resolve('image/jpeg')
        return
      }
      
      // Check for PNG
      if (arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4E && arr[3] === 0x47) {
        resolve('image/png')
        return
      }
      
      // Check for GIF
      if (arr[0] === 0x47 && arr[1] === 0x49 && arr[2] === 0x46) {
        resolve('image/gif')
        return
      }
      
      // Check for WebP
      if (arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46 &&
          arr[8] === 0x57 && arr[9] === 0x45 && arr[10] === 0x42 && arr[11] === 0x50) {
        resolve('image/webp')
        return
      }
      
      // Default: use the file's reported type or unknown
      resolve(file.type || 'unknown')
    }
    
    reader.onerror = () => {
      resolve(file.type || 'unknown')
    }
    
    // Read first 12 bytes for magic number detection
    reader.readAsArrayBuffer(file.slice(0, 12))
  })
}

/**
 * Process an image file for upload
 * - Validates the file type
 * - Converts iOS HEIC/HEIF to JPEG using heic2any
 * - Falls back to canvas conversion for other formats
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
  
  // Detect actual file type from header bytes (more reliable than MIME type on iOS)
  const detectedType = await detectFileType(file)
  console.log('Detected file type:', detectedType)
  
  const originalType = file.type || detectedType
  const extension = file.name.split('.').pop()?.toLowerCase() || ''
  
  // Check if it's a HEIC file (by any detection method)
  const isHeic = isHeicFile(file) || detectedType === 'image/heic'
  
  // Validate that it's an image file
  const isValidImage = 
    STANDARD_IMAGE_TYPES.includes(detectedType) ||
    isHeic ||
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'].includes(extension) ||
    originalType.startsWith('image/')
  
  if (!isValidImage) {
    throw new Error('Invalid file type. Please upload an image file (JPEG, PNG, WebP, GIF, or HEIC).')
  }
  
  // Handle HEIC files with heic2any library
  if (isHeic) {
    console.log('HEIC file detected, using heic2any for conversion...')
    try {
      const convertedFile = await convertHeicToJpeg(file)
      return {
        file: convertedFile,
        originalType: 'image/heic',
        wasConverted: true
      }
    } catch (error) {
      console.error('HEIC conversion failed:', error)
      throw new Error('Could not process this HEIC image. Please try converting it to JPEG first.')
    }
  }
  
  // Handle other non-standard formats with canvas conversion
  if (needsConversion(originalType) && !STANDARD_IMAGE_TYPES.includes(detectedType)) {
    console.log('Image requires canvas conversion...')
    try {
      const convertedFile = await convertToJpeg(file)
      console.log('Canvas conversion successful:', {
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
      console.error('Canvas conversion failed:', error)
      // If it's detected as a standard type, try using original
      if (STANDARD_IMAGE_TYPES.includes(detectedType)) {
        console.log('Using original file as fallback (detected as standard type)')
        return {
          file,
          originalType,
          wasConverted: false
        }
      }
      throw new Error('Could not process this image. Please try a different image or format.')
    }
  }
  
  // No conversion needed for standard web formats
  console.log('No conversion needed, using original file')

  // Fix iOS MIME type issue: If the detected type differs from file.type,
  // create a new File object with the correct MIME type
  if (detectedType !== file.type && STANDARD_IMAGE_TYPES.includes(detectedType)) {
    console.log('Correcting MIME type:', {
      originalMimeType: file.type,
      detectedMimeType: detectedType
    })

    const correctedFile = new File([file], file.name, {
      type: detectedType,
      lastModified: file.lastModified
    })

    return {
      file: correctedFile,
      originalType,
      wasConverted: false
    }
  }

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
  convertHeicToJpeg,
  resizeImageIfNeeded,
  needsConversion,
  FILE_INPUT_ACCEPT,
  ACCEPTED_IMAGE_TYPES
}

declare module 'heic2any' {
  interface Heic2AnyOptions {
    /**
     * The HEIC/HEIF blob to convert
     */
    blob: Blob
    
    /**
     * The target image format
     * @default 'image/png'
     */
    toType?: 'image/jpeg' | 'image/png' | 'image/gif'
    
    /**
     * Quality for JPEG output (0-1)
     * @default 0.92
     */
    quality?: number
    
    /**
     * If true, returns an array of blobs (for multi-image HEIC files)
     * @default false
     */
    multiple?: boolean
    
    /**
     * If true, returns a gif for multi-image HEIC files
     * @default false
     */
    gifInterval?: number
  }
  
  /**
   * Convert HEIC/HEIF images to web-compatible formats
   * @param options Conversion options
   * @returns Promise resolving to a Blob or array of Blobs
   */
  function heic2any(options: Heic2AnyOptions): Promise<Blob | Blob[]>
  
  export = heic2any
}

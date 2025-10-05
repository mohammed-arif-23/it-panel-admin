import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Validate that all required environment variables are present
const requiredEnvVars = [
  'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
]

const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
if (missingVars.length > 0) {
  console.warn(`Missing Cloudinary environment variables: ${missingVars.join(', ')}`)
}

export class CloudinaryStorageService {
  private static instance: CloudinaryStorageService
  private folder = 'assignments' // Folder name for organization

  static getInstance(): CloudinaryStorageService {
    if (!CloudinaryStorageService.instance) {
      CloudinaryStorageService.instance = new CloudinaryStorageService()
    }
    return CloudinaryStorageService.instance
  }

  /**
   * Upload file to Cloudinary
   * @param file - File to upload (as Buffer or base64 string)
   * @param fileName - Name for the file
   * @returns Promise with download URL
   */
  async uploadFile(fileBuffer: Buffer, fileName: string): Promise<{ publicUrl: string; path: string }> {
    try {
      // Extract file extension
      const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'pdf'
      
      // Create unique public_id without removing extension
      const timestamp = Date.now()
      const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '')
      const publicId = `${nameWithoutExt}_${timestamp}`
      
      // Determine MIME type based on extension
      const mimeTypeMap: { [key: string]: string } = {
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'txt': 'text/plain'
      }
      const mimeType = mimeTypeMap[fileExtension] || 'application/octet-stream'
      
      // Upload to Cloudinary with proper settings
      const result = await cloudinary.uploader.upload(
        `data:${mimeType};base64,${fileBuffer.toString('base64')}`,
        {
          public_id: publicId,
          resource_type: 'raw', // Use 'raw' for non-image files
          use_filename: false, // Use our custom public_id
          unique_filename: false, // We're handling uniqueness ourselves
          overwrite: false,
          folder: this.folder,
          format: fileExtension, // Explicitly preserve the file extension
        }
      )

      console.log('Cloudinary upload result:', {
        secure_url: result.secure_url,
        public_id: result.public_id,
        resource_type: result.resource_type,
        format: result.format
      })

      return {
        publicUrl: result.secure_url,
        path: result.public_id
      }
    } catch (error) {
      console.error('Error uploading file to Cloudinary:', error)
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete file from Cloudinary
   * @param publicId - Public ID of the file to delete
   * @param resourceType - Type of resource ('image', 'video', 'raw'). Defaults to 'raw' for documents.
   */
  async deleteFile(publicId: string, resourceType: 'image' | 'video' | 'raw' = 'raw'): Promise<void> {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        invalidate: true // Invalidate CDN cache
      });
      console.log('Cloudinary delete result:', result);
      
      if (result.result !== 'ok' && result.result !== 'not found') {
        throw new Error(`Unexpected result: ${result.result}`);
      }
    } catch (error) {
      console.error('Error deleting file from Cloudinary:', error);
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get optimized URL for an existing file
   * @param publicId - Public ID of the file
   * @returns Optimized URL
   */
  getOptimizedUrl(publicId: string): string {
    return cloudinary.url(publicId, {
      fetch_format: 'auto',
      quality: 'auto',
      secure: true
    })
  }
}

// Export singleton instance
export const cloudinaryStorage = CloudinaryStorageService.getInstance()

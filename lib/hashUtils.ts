import crypto from 'crypto'

/**
 * Calculate SHA-256 hash of a file from its URL
 * This ensures accurate hash matching for plagiarism detection
 */
export async function calculateFileHash(fileUrl: string): Promise<string> {
  try {
    console.log('Calculating hash for:', fileUrl)
    
    // Fetch the file content
    const response = await fetch(fileUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PlagiarismDetector/1.0)',
        'Accept': 'application/pdf,application/octet-stream,*/*'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`)
    }
    
    // Get the file as ArrayBuffer for consistent hashing
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Calculate SHA-256 hash
    const hash = crypto.createHash('sha256')
    hash.update(buffer)
    const fileHash = hash.digest('hex')
    
    console.log('Hash calculated successfully:', fileHash.substring(0, 8) + '...')
    return fileHash
    
  } catch (error) {
    console.error('Error calculating file hash:', error)
    throw new Error(`Failed to calculate file hash: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Calculate hash from file buffer (for direct uploads)
 */
export function calculateHashFromBuffer(buffer: Buffer): string {
  const hash = crypto.createHash('sha256')
  hash.update(buffer)
  return hash.digest('hex')
}

/**
 * Validate hash format (64 character hex string)
 */
export function isValidHash(hash: string): boolean {
  return /^[a-f0-9]{64}$/i.test(hash)
}

/**
 * Compare two hashes for exact match
 */
export function compareHashes(hash1: string, hash2: string): boolean {
  if (!isValidHash(hash1) || !isValidHash(hash2)) {
    return false
  }
  return hash1.toLowerCase() === hash2.toLowerCase()
}

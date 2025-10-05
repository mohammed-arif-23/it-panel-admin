import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiKey || !apiSecret) {
      console.error('Missing Cloudinary configuration')
      return NextResponse.json(
        { error: 'Cloudinary not properly configured' },
        { status: 500 }
      )
    }

    const body = await request.json().catch(() => ({})) as { folder?: string }
    const requestedFolder = typeof body?.folder === 'string' ? body.folder.trim() : ''

    // Allow subject codes containing letters, numbers, space, underscore, hyphen, dot, ampersand and parentheses
    const isQPFolder = /^questionpapers\/[A-Za-z0-9 _\-\.\&()]+$/.test(requestedFolder)
    const safeFolder = isQPFolder ? requestedFolder : (requestedFolder === 'assignments' ? 'assignments' : 'assignments')

    const timestamp = Math.round(Date.now() / 1000)

    const paramsToSign = {
      timestamp: timestamp.toString(),
      folder: safeFolder,
      use_filename: 'true',
      unique_filename: 'false'
    }

    const signatureString = Object.entries(paramsToSign)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&') + apiSecret

    const signature = createHash('sha1')
      .update(signatureString)
      .digest('hex')

    return NextResponse.json({
      signature,
      timestamp: paramsToSign.timestamp,
      cloudName,
      apiKey,
      folder: paramsToSign.folder,
      use_filename: paramsToSign.use_filename,
      unique_filename: paramsToSign.unique_filename,
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`
    })
  } catch (error) {
    console.error('Error generating Cloudinary signature:', error)
    return NextResponse.json(
      { error: 'Failed to generate upload signature' },
      { status: 500 }
    )
  }
}

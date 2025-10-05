import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

// POST /api/qps/delete
// body: { public_id: string }
export async function POST(req: NextRequest) {
  try {
    const { public_id } = await req.json()
    if (!public_id || typeof public_id !== 'string') {
      return NextResponse.json({ success: false, error: 'public_id is required' }, { status: 400 })
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ success: false, error: 'Cloudinary not configured' }, { status: 500 })
    }

    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true })

    // Attempt deletion across possible resource types since QPs may be PDFs (raw) or images
    const resourceTypes: Array<'raw' | 'image' | 'video'> = ['raw', 'image', 'video']
    let deleted = false
    let lastError: any = null
    for (const rt of resourceTypes) {
      try {
        const res = await cloudinary.uploader.destroy(public_id, { invalidate: true, resource_type: rt as any, type: 'upload' as any })
        if (res.result === 'ok' || res.result === 'not found') {
          deleted = true
          break
        }
      } catch (e) {
        lastError = e
      }
    }

    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Failed to delete file' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Delete error', err)
    return NextResponse.json({ success: false, error: 'Unexpected error' }, { status: 500 })
  }
}

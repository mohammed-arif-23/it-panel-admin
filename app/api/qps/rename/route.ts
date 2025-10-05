import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

// POST /api/qps/rename
// body: { public_id: string, new_name: string }
export async function POST(req: NextRequest) {
  try {
    const { public_id, new_name } = await req.json()
    if (!public_id || typeof public_id !== 'string') {
      return NextResponse.json({ success: false, error: 'public_id is required' }, { status: 400 })
    }
    if (!new_name || typeof new_name !== 'string') {
      return NextResponse.json({ success: false, error: 'new_name is required' }, { status: 400 })
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ success: false, error: 'Cloudinary not configured' }, { status: 500 })
    }

    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true })

    // Keep the same folder, change only the file name (without extension handling by Cloudinary; name should include extension if desired)
    const parts = public_id.split('/')
    const folder = parts.slice(0, -1).join('/')
    const newPublicId = folder ? `${folder}/${new_name.replace(/\s+/g,'_')}` : new_name.replace(/\s+/g,'_')

    const res = await cloudinary.uploader.rename(public_id, newPublicId, { overwrite: false, to_type: 'upload' as any })

    return NextResponse.json({ success: true, data: { public_id: res.public_id, secure_url: (res as any).secure_url } })
  } catch (err: any) {
    console.error('Rename error', err)
    return NextResponse.json({ success: false, error: 'Unexpected error' }, { status: 500 })
  }
}

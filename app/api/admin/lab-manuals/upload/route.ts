import { NextRequest, NextResponse } from 'next/server'

// POST /api/admin/lab-manuals/upload
// This endpoint is not used for actual file upload (files go directly to Cloudinary)
// But we can use it for any post-upload processing or logging if needed
export async function POST(req: NextRequest) {
  try {
    // In the current implementation, files are uploaded directly to Cloudinary
    // This endpoint could be used for logging, database updates, or other post-processing
    return NextResponse.json({ success: true, message: 'Upload endpoint ready' })
  } catch (err: any) {
    console.error('Upload endpoint error', err)
    return NextResponse.json({ success: false, error: 'Unexpected error' }, { status: 500 })
  }
}
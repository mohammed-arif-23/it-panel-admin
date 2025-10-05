import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

// GET /api/notes/list?subject=CODE
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const subject = searchParams.get('subject')?.trim()

    if (!subject) {
      return NextResponse.json({ success: false, error: 'subject is required' }, { status: 400 })
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiKey || !apiSecret) {
      console.error('Missing Cloudinary configuration')
      return NextResponse.json({ success: false, error: 'Cloudinary not configured' }, { status: 500 })
    }

    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true })
    const sanitize = (s: string) => s
      .trim()
      .replace(/&/g, 'and')
      .replace(/[^A-Za-z0-9 _().\-]/g, '')
      .replace(/\s+/g, '_')

    const sanitized = sanitize(subject)
    const folderOriginal = `notes/${subject}`
    const folderSanitized = `notes/${sanitized}`
    const exprOriginal = `folder="${folderOriginal.replace(/"/g, '\\"')}` // Changed from \" to "
    const exprSanitized = `folder="${folderSanitized.replace(/"/g, '\\"')}` // Changed from \" to "

    const res1 = await cloudinary.search.expression(exprOriginal).max_results(200).execute().catch(() => ({ resources: [] }))
    const res2 = await cloudinary.search.expression(exprSanitized).max_results(200).execute().catch(() => ({ resources: [] }))

    const merged = [...(res1.resources || []), ...(res2.resources || [])]
    const uniqueMap = new Map<string, any>()
    for (const r of merged) {
      if (!uniqueMap.has((r as any).public_id)) uniqueMap.set((r as any).public_id, r)
    }
    const files = Array.from(uniqueMap.values()).map((r: any) => ({
      public_id: r.public_id,
      format: r.format,
      url: r.secure_url,
      bytes: r.bytes,
      created_at: r.created_at,
      filename: r.filename || r.public_id.split('/').pop(),
      folder: r.folder,
      resource_type: r.resource_type,
    }))

    return NextResponse.json({ success: true, data: files })
  } catch (err) {
    console.error('Cloudinary list error', err)
    return NextResponse.json({ success: false, error: 'Failed to list notes' }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fileUrl = searchParams.get('url')
    const fileName = searchParams.get('filename')

    if (!fileUrl) {
      return NextResponse.json({ error: 'File URL is required' }, { status: 400 })
    }

    // Fetch the file from the external URL (Cloudinary/Supabase)
    const response = await fetch(fileUrl)
    
    if (!response.ok) {
      return NextResponse.json({ error: 'File not found or not accessible' }, { status: 404 })
    }

    // Get the file content
    const fileBuffer = await response.arrayBuffer()
    
    // Determine content type
    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    
    // Create response with proper headers for file download
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName || 'download'}"`,
        'Content-Length': fileBuffer.byteLength.toString(),
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('Download proxy error:', error)
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
  }
}
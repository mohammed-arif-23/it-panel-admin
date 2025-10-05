import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cloudinaryStorage } from '../../../../lib/cloudinaryStorage'

// Configure body size limit for this route (9MB to stay under Vercel's limit)
export const maxDuration = 30 // 30 seconds timeout
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Use service role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role key bypasses RLS
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    // Check content length before processing
    const contentLength = request.headers.get('content-length')
    const maxSize = 9 * 1024 * 1024 // 9MB in bytes
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      return NextResponse.json(
        { 
          error: 'File too large. Maximum file size is 9MB.',
          maxSize: '9MB',
          receivedSize: `${(parseInt(contentLength) / 1024 / 1024).toFixed(2)}MB`
        }, 
        { status: 413 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const assignmentId = formData.get('assignment_id') as string
    const studentId = formData.get('student_id') as string
    const registerNumber = formData.get('register_number') as string
    const studentName = formData.get('student_name') as string

    if (!file || !assignmentId || !studentId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Double-check file size after FormData parsing
    if (file.size > maxSize) {
      return NextResponse.json(
        { 
          error: 'File too large. Maximum file size is 9MB.',
          maxSize: '9MB',
          receivedSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`
        }, 
        { status: 413 }
      )
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF files are allowed.' }, 
        { status: 400 }
      )
    }

    // Generate filename: studentName_studentRegisterNumber_timestamp.pdf
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf' // Default to pdf if no extension
    const timestamp = Date.now()
    const sanitizedName = (studentName || 'Student').replace(/[^a-zA-Z0-9]/g, '') // Remove special characters
    const fileName = `${sanitizedName}_${registerNumber}_${timestamp}.${fileExt}`

    console.log('File processing:', {
      originalName: file.name,
      extractedExtension: fileExt,
      generatedFileName: fileName,
      fileType: file.type
    })

    // Upload file to Cloudinary storage
    let uploadResult
    try {
      // Convert file to buffer for Cloudinary
      const fileBuffer = Buffer.from(await file.arrayBuffer())
      uploadResult = await cloudinaryStorage.uploadFile(fileBuffer, fileName)
    } catch (uploadError) {
      console.error('Cloudinary upload error:', uploadError)
      return NextResponse.json({ error: uploadError instanceof Error ? uploadError.message : 'Upload failed' }, { status: 500 })
    }

    // Generate random marks (8 or 9 out of 10)
    const randomMarks = Math.floor(Math.random() * 2) + 8

    // Build IST timestamp string (+05:30)
    const now = new Date()
    const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000)
    const pad = (n: number) => String(n).padStart(2, '0')
    const istTimestamp = `${istNow.getUTCFullYear()}-${pad(istNow.getUTCMonth() + 1)}-${pad(istNow.getUTCDate())}T${pad(istNow.getUTCHours())}:${pad(istNow.getUTCMinutes())}:${pad(istNow.getUTCSeconds())}+05:30`

    // Insert submission using service role (bypasses RLS)
    const { data, error } = await supabase
      .from('assignment_submissions')
      .insert({
        assignment_id: assignmentId,
        student_id: studentId,
        file_url: uploadResult.publicUrl,
        file_name: file.name,
        marks: randomMarks,
        status: 'graded',
        submitted_at: istTimestamp,
        graded_at: istTimestamp
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data, marks: randomMarks })
  } catch (error) {
    console.error('Server error:', error)
    
    // Handle specific error types
    if (error instanceof Error) {
      // Check for body size limit errors
      if (error.message.includes('PayloadTooLargeError') || error.message.includes('Entity too large')) {
        return NextResponse.json(
          { 
            error: 'File too large. Maximum file size is 9MB.',
            maxSize: '9MB'
          }, 
          { status: 413 }
        )
      }
      
      // Check for timeout errors
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        return NextResponse.json(
          { error: 'Upload timeout. Please try again with a smaller file.' }, 
          { status: 408 }
        )
      }
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}